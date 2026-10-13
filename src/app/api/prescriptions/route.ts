import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const patientId = Number(sp.get("patientId") || 0);
  const where = patientId ? { patientId } : {};
  const pageParam = sp.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.prescription.findMany({ where, include: { patient: true, caseHistory: true, items: { include: { medicine: true } } }, orderBy: { prescribedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.prescription.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  }
  return ok(await db.prescription.findMany({ where, include: { patient: true, caseHistory: true, items: { include: { medicine: true } } }, orderBy: { prescribedAt: "desc" } }));
}
export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req); if (!b?.patientId || !b?.caseHistoryId || !Array.isArray(b.medicines)) return bad("Patient, case and medicines are required.");
  if (b.medicines.some((m: any) => !m.medicineId)) return bad("Select a medicine for every line.");
  const p = await db.prescription.create({ data: { patientId: Number(b.patientId), caseHistoryId: Number(b.caseHistoryId), diagnosis: b.diagnosis || null, notes: b.notes || null, items: { create: b.medicines.map((m: any) => ({ medicineId: Number(m.medicineId), dosage: m.dosage, duration: m.duration, instructions: m.instructions || null })) } }, include: { items: { include: { medicine: true } }, patient: true, caseHistory: true } });
  return ok(p, 201);
}
