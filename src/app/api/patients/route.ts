import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { withRunningAgreement, actor } from "@/lib/agreements";

export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const gender = searchParams.get("gender")?.trim() ?? "";
  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { patientNo: { contains: q, mode: "insensitive" } }];
  if (gender) where.gender = gender;
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = searchParams.get("dateTo")?.trim() ?? "";
  if (dateFrom || dateTo) {
    where.admissionDate = {};
    if (dateFrom) where.admissionDate.gte = new Date(dateFrom);
    if (dateTo) where.admissionDate.lte = new Date(dateTo + "T23:59:59.999");
  }
  const pageParam = searchParams.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { caseHistories: true, prescriptions: true, payments: true } } }
      }),
      db.patient.count({ where }),
    ]);
    return ok({ items: await withRunningAgreement(items), total, page, pageSize });
  }
  const patients = await db.patient.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { caseHistories: true, prescriptions: true, payments: true } } }
  });
  return ok(await withRunningAgreement(patients));
}
// next sequential patient number: P-0001, P-0002, ...
async function nextPatientNo() {
  const rows = await db.patient.findMany({
    where: { patientNo: { startsWith: "P-" } },
    select: { patientNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = Number(r.patientNo.slice(2));
    if (!isNaN(n) && n > max) max = n;
  }
  return `P-${String(max + 1).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  { const denied = await denyUnless("PATIENT.C"); if (denied) return denied; }
  const body = await parseBody(req);
  if (!body?.name || !body?.phone) return bad("Name and phone are required.");
  // two attempts in case two registrations race for the same number
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await createPatient(body, actor(await requireSession()));
    } catch (e: any) {
      if (e?.code === "P2002" && attempt === 0) continue;
      console.error("Patient create failed:", e);
      return bad("Save failed: " + (e?.message?.split("\n").pop()?.trim() || "unknown error"), 500);
    }
  }
  return bad("Could not assign a patient number, try again.", 500);
}

async function createPatient(body: any, by: string | null) {
  const patient = await db.patient.create({ data: {
    patientNo: await nextPatientNo(),
    name: body.name, age: body.age ? Number(body.age) : null, phone: body.phone,
    email: body.email || null, address: body.address || null, photoUrl: body.photoUrl || null,
    gender: body.gender || null, bloodGroup: body.bloodGroup || null, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
    admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined, notes: body.notes || null
  }});
  // first service charge agreement, opened on the entry date
  const charge = Number(body.serviceCharge || 0);
  if (charge > 0) {
    await db.patientXAgreement.create({ data: {
      patientId: patient.id, serviceChargeAmount: charge, isClosed: "N",
      openDate: patient.admissionDate, agreementDetails: body.agreementDetails || null, createdBy: by,
    }});
  }
  return ok(patient, 201);
}
