import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { denyUnlessAny } from "@/lib/permissions";
import { templateItems } from "@/lib/rx-directions";

// One template with its medicines; lines whose medicine was deleted are left out
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const t = await db.prescriptionTemplate.findUnique({ where: { id: Number(params.id) } });
    if (!t) return bad("Template not found", 404);
    const items = templateItems(t.items);
    const meds = await db.medicine.findMany({ where: { id: { in: items.map((i) => i.medicineId) } } });
    const byId = new Map(meds.map((m: any) => [m.id, m]));
    return ok({
        ...t,
        items: items.filter((i) => byId.has(i.medicineId)).map((i) => ({ ...i, medicine: byId.get(i.medicineId) })),
        missing: items.filter((i) => !byId.has(i.medicineId)).length,
    });
}

// body: { name?, items? }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnlessAny(["PRESCRIPTION.C", "CASE.E"]); if (denied) return denied; }
    const id = Number(params.id);
    const b = await parseBody(req);
    const data: any = {};
    if (b?.name !== undefined) {
        const name = String(b.name).trim();
        if (!name) return bad("Template name is required.");
        if (name.length > 100) return bad("Template name can be at most 100 characters.");
        const taken = await db.prescriptionTemplate.findFirst({ where: { name: { equals: name, mode: "insensitive" }, id: { not: id } } });
        if (taken) return bad(`A template named "${name}" already exists.`);
        data.name = name;
    }
    if (b?.items !== undefined) {
        data.items = templateItems(b.items);
        if (!data.items.length) return bad("Add at least one medicine before saving a template.");
    }
    try {
        return ok(await db.prescriptionTemplate.update({ where: { id }, data }));
    } catch (e: any) {
        if (e?.code === "P2025") return bad("Template not found", 404);
        throw e;
    }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnlessAny(["PRESCRIPTION.C", "CASE.E"]); if (denied) return denied; }
    await db.prescriptionTemplate.deleteMany({ where: { id: Number(params.id) } });
    return ok({ deleted: true });
}
