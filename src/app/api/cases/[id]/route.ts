import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const c = await db.caseHistory.findUnique({ where: { id: Number(params.id) }, include: { patient: true, prescriptions: { include: { items: { include: { medicine: true } } }, orderBy: { id: "asc" } } } });
  return c ? ok(c) : bad("Case not found", 404);
}

async function syncPrescription(caseId: number, patientId: number, diagnosis: string | null, medicines: any[]) {
  const lines = (medicines || []).filter((m: any) => m?.medicineId);
  const existing = await db.prescription.findFirst({ where: { caseHistoryId: caseId }, orderBy: { id: "asc" } });
  const items = lines.map((m: any) => ({
    medicineId: Number(m.medicineId),
    dosage: m.dosage?.trim() || "-",
    duration: m.duration?.trim() || "-",
    instructions: m.instructions?.trim() || null,
  }));
  if (existing) {
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } });
    if (items.length) await db.prescription.update({ where: { id: existing.id }, data: { diagnosis, items: { create: items } } });
    else await db.prescription.delete({ where: { id: existing.id } });
    return;
  }
  if (items.length) await db.prescription.create({ data: { patientId, caseHistoryId: caseId, diagnosis, items: { create: items } } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  { const denied = await denyUnless("CASE.E"); if (denied) return denied; }
  const b = await parseBody(req);
  const before = await db.caseHistory.findUnique({ where: { id: Number(params.id) }, select: { followUpDate: true } });
  const newFollow = b.followUpDate ? new Date(b.followUpDate).toISOString().slice(0, 10) : null;
  const oldFollow = before?.followUpDate ? before.followUpDate.toISOString().slice(0, 10) : null;
  const resetSms = newFollow !== oldFollow ? { followUpSmsSentAt: null } : {};
  const c = await db.caseHistory.update({ where: { id: Number(params.id) }, data: {
    ...resetSms, toothNumber: b.toothNumber, bp: b.bp || null, oe: b.oe || null, followUpDate: b.followUpDate ? new Date(b.followUpDate) : null, problem: b.problem, treatment: b.treatment, details: b.details, status: b.status, caseDate: b.caseDate ? new Date(b.caseDate) : undefined } });
  if (Array.isArray(b.medicines)) await syncPrescription(c.id, c.patientId, b.problem || null, b.medicines);
  return ok(c);
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  { const denied = await denyUnless("CASE.E"); if (denied) return denied; }
  const id = Number(params.id);
  const payments = await db.payment.count({ where: { caseHistoryId: id } });
  if (payments) {
    return bad(`Cannot delete: ${payments} bill collection transaction${payments === 1 ? " is" : "s are"} linked to this case. Delete those first.`);
  }
  // the case's prescription lines belong to the case itself, so they go with it
  await db.caseHistory.delete({ where: { id } });
  return ok({ success: true });
}
