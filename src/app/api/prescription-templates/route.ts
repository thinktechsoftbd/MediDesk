import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { denyUnlessAny } from "@/lib/permissions";
import { templateItems } from "@/lib/rx-directions";

// Rx templates for the prescription page sidebar, newest first
export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const rows = await db.prescriptionTemplate.findMany({ orderBy: { updatedAt: "desc" } });
    return ok(rows.map((t: any) => ({ id: t.id, name: t.name, updatedAt: t.updatedAt, count: Array.isArray(t.items) ? t.items.length : 0 })));
}

// body: { name, items: [{ medicineId, directions }] }. 409 with { id } when the name is taken.
export async function POST(req: Request) {
    { const denied = await denyUnlessAny(["PRESCRIPTION.C", "CASE.E"]); if (denied) return denied; }
    const session: any = await requireSession();
    const b = await parseBody(req);
    const name = String(b?.name ?? "").trim();
    if (!name) return bad("Template name is required.");
    if (name.length > 100) return bad("Template name can be at most 100 characters.");
    const items = templateItems(b?.items);
    if (!items.length) return bad("Add at least one medicine before saving a template.");

    const taken = await db.prescriptionTemplate.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
    if (taken) return ok({ error: `A template named "${name}" already exists.`, id: taken.id }, 409);

    const t = await db.prescriptionTemplate.create({ data: { name, items, createdBy: Number(session?.user?.id) || null } });
    return ok(t, 201);
}
