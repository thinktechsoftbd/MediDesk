import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { denyUnless } from "@/lib/permissions";
import { agreementTotals, actor } from "@/lib/agreements";

export const dynamic = "force-dynamic";

// All service charge agreements of a patient, newest first, with totals
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const rows = await db.patientXAgreement.findMany({
        where: { patientId: Number(params.id) },
        orderBy: [{ isClosed: "asc" }, { openDate: "desc" }],
        include: { _count: { select: { payments: true } } },
    });
    const totals = await agreementTotals(rows.map((r: any) => r.id));
    return ok(rows.map((r: any) => ({ ...r, serviceChargeAmount: Number(r.serviceChargeAmount), ...totals[r.id] })));
}

// Open a new agreement (only when none is running)
export async function POST(req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnless("PATIENT.E"); if (denied) return denied; }
    const patientId = Number(params.id);
    const b = await parseBody(req);
    const amount = Number(b?.serviceChargeAmount || 0);
    if (!(amount > 0)) return bad("Enter the total service charge.");
    const running = await db.patientXAgreement.count({ where: { patientId, isClosed: "N" } });
    if (running) return bad("This patient already has a running agreement. Close it first.");
    const a = await db.patientXAgreement.create({
        data: {
            patientId, serviceChargeAmount: amount, isClosed: "N",
            openDate: b?.openDate ? new Date(b.openDate) : new Date(),
            agreementDetails: b?.agreementDetails || null,
            createdBy: actor(await requireSession()),
        },
    });
    return ok(a, 201);
}
