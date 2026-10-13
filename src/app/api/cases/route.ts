import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  try {
    return await listCases(req);
  } catch (e: any) {
    console.error("Case list failed:", e);
    return bad("Could not load cases: " + (e?.message?.split("\n").filter(Boolean).pop()?.trim() || "unknown error") + " (run: npx prisma db push && npx prisma generate)", 500);
  }
}

async function listCases(req: Request) {
  const { searchParams } = new URL(req.url), patientId = Number(searchParams.get("patientId") || 0);
  const q = searchParams.get("q")?.trim() ?? "";
  const where: any = {};
  if (patientId) where.patientId = patientId;
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = searchParams.get("dateTo")?.trim() ?? "";
  if (dateFrom || dateTo) {
    where.caseDate = {};
    if (dateFrom) where.caseDate.gte = new Date(dateFrom);
    if (dateTo) where.caseDate.lte = new Date(dateTo + "T23:59:59.999");
  }
  if (q) where.OR = [
    { problem: { contains: q, mode: "insensitive" } },
    { treatment: { contains: q, mode: "insensitive" } },
    { toothNumber: { contains: q, mode: "insensitive" } },
    { patient: { is: { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { patientNo: { contains: q, mode: "insensitive" } },
    ] } } },
  ];
  const pageParam = searchParams.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.caseHistory.findMany({ where, include: { patient: true, prescriptions: true }, orderBy: [{ patientId: "asc" }, { caseNo: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      db.caseHistory.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  }
  return ok(await db.caseHistory.findMany({ where, include: { patient: true, prescriptions: true }, orderBy: [{ patientId: "asc" }, { caseNo: "asc" }] }));
}
async function syncPrescription(caseId: number, patientId: number, diagnosis: string | null, medicines: any[]) {
  const lines = (medicines || []).filter((m: any) => m?.medicineId);
  const existing = await db.prescription.findFirst({ where: { caseHistoryId: caseId }, orderBy: { id: "asc" } });
  if (!lines.length) return existing;
  const items = lines.map((m: any) => ({
    medicineId: Number(m.medicineId),
    dosage: m.dosage?.trim() || "-",
    duration: m.duration?.trim() || "-",
    instructions: m.instructions?.trim() || null,
  }));
  if (existing) {
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } });
    return db.prescription.update({ where: { id: existing.id }, data: { diagnosis, items: { create: items } } });
  }
  return db.prescription.create({ data: { patientId, caseHistoryId: caseId, diagnosis, items: { create: items } } });
}

export async function POST(req: Request) {
  { const denied = await denyUnless("CASE.C"); if (denied) return denied; }
  const b = await parseBody(req); if (!b?.patientId) return bad("Patient is required.");
  const patientId = Number(b.patientId);
  // auto-generate the next case number for this patient
  const last = await db.caseHistory.findFirst({ where: { patientId }, orderBy: { caseNo: "desc" } });
  const caseNo = (last?.caseNo || 0) + 1;
  const c = await db.caseHistory.create({ data: { patientId, caseNo, toothNumber: b.toothNumber || null, bp: b.bp || null, oe: b.oe || null, followUpDate: b.followUpDate ? new Date(b.followUpDate) : null, problem: b.problem || null, treatment: b.treatment || null, details: b.details || null, caseDate: b.caseDate ? new Date(b.caseDate) : new Date(), status: b.status || "IN_PROGRESS" } });
  await syncPrescription(c.id, patientId, b.problem || null, b.medicines);
  return ok(c, 201);
}
