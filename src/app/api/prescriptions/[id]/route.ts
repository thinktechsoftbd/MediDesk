import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const p = await db.prescription.findUnique({ where: { id: Number(params.id) }, include: { patient: true, caseHistory: true, items: { include: { medicine: true } } } });
  return p ? ok(p) : bad("Prescription not found", 404);
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  await db.prescription.delete({ where: { id: Number(params.id) } }); return ok({ success: true });
}
