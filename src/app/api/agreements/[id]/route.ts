import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { denyUnless } from "@/lib/permissions";
import { actor } from "@/lib/agreements";

// Update amount/details, or close the agreement: { close: true }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnless("PATIENT.E"); if (denied) return denied; }
    const id = Number(params.id);
    const b = await parseBody(req);
    const a: any = await db.patientXAgreement.findUnique({ where: { id } });
    if (!a) return bad("Agreement not found.", 404);
    if (a.isClosed === "Y") return bad("This agreement is already closed.");

    const by = actor(await requireSession());
    const data: any = { updatedDate: new Date(), updatedBy: by };
    if (b?.close) {
        data.isClosed = "Y";
        data.closedDate = new Date();
    } else {
        if (b?.serviceChargeAmount !== undefined) {
            const amount = Number(b.serviceChargeAmount);
            if (!(amount > 0)) return bad("Total service charge must be more than 0.");
            data.serviceChargeAmount = amount;
        }
        if (b?.agreementDetails !== undefined) data.agreementDetails = b.agreementDetails || null;
    }
    return ok(await db.patientXAgreement.update({ where: { id }, data }));
}

// Only an agreement without collections can be removed
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnless("PATIENT.E"); if (denied) return denied; }
    const id = Number(params.id);
    const used = await db.payment.count({ where: { agreementId: id } });
    if (used) return bad(`Cannot delete: ${used} bill collection${used === 1 ? " is" : "s are"} linked to this agreement. Close it instead.`);
    await db.patientXAgreement.delete({ where: { id } });
    return ok({ success: true });
}
