import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { medicineData } from "@/lib/medicine-label";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.name?.trim()) return bad("Brand Name is required.");
  return ok(await db.medicine.update({ where: { id: Number(params.id) }, data: {
    ...medicineData(b),
  }}));
}

// blocked while any case history prescription uses the medicine
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const id = Number(params.id);
  const used = await db.prescriptionItem.count({ where: { medicineId: id } });
  if (used) return bad(`Cannot delete: this medicine is used in ${used} prescription line${used === 1 ? "" : "s"}.`);
  await db.medicine.delete({ where: { id } });
  return ok({ deleted: true });
}
