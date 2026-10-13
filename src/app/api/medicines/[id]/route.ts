import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.name?.trim()) return bad("Medicine Name is required.");
  return ok(await db.medicine.update({ where: { id: Number(params.id) }, data: {
    name: b.name.trim(),
    strength: b.strength?.trim() || null,
    unit: b.unit?.trim() || null,
    dosageForm: b.dosageForm?.trim() || null,
    manufacturerType: b.manufacturerType?.trim() || null,
    treatmentUse: b.treatmentUse?.trim() || null,
    updatedBy: session.user?.email || session.user?.name || null,
  }}));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  await db.medicine.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
