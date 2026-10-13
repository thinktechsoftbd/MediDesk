import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const patient = await db.patient.findUnique({ where: { id: Number(params.id) }, include: { caseHistories: { orderBy: { caseNo: "asc" } }, prescriptions: { include: { items: { include: { medicine: true } }, caseHistory: true }, orderBy: { prescribedAt: "desc" } }, payments: { orderBy: { paymentDate: "desc" } }, agreements: { orderBy: { openDate: "desc" } }, appointments: { orderBy: { appointmentAt: "asc" } } } });
  return patient ? ok(patient) : bad("Patient not found", 404);
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  { const denied = await denyUnless("PATIENT.E"); if (denied) return denied; }
  const body = await parseBody(req);
  const patient = await db.patient.update({ where: { id: Number(params.id) }, data: {
    name: body.name, age: body.age ? Number(body.age) : null, phone: body.phone, email: body.email || null,
    address: body.address || null, photoUrl: body.photoUrl || null, gender: body.gender || null, bloodGroup: body.bloodGroup || null,
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
    admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined, notes: body.notes || null
  }});
  return ok(patient);
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  { const denied = await denyUnless("PATIENT.E"); if (denied) return denied; }
  const id = Number(params.id);
  const [cases, payments, prescriptions, appointments] = await Promise.all([
    db.caseHistory.count({ where: { patientId: id } }),
    db.payment.count({ where: { patientId: id } }),
    db.prescription.count({ where: { patientId: id } }),
    db.appointment.count({ where: { patientId: id } }),
  ]);
  const used = [
    cases && `${cases} case histor${cases === 1 ? "y" : "ies"}`,
    payments && `${payments} payment${payments === 1 ? "" : "s"}`,
    prescriptions && `${prescriptions} prescription${prescriptions === 1 ? "" : "s"}`,
    appointments && `${appointments} appointment${appointments === 1 ? "" : "s"}`,
  ].filter(Boolean);
  if (used.length) return bad(`Cannot delete: this patient has ${used.join(", ")}. Delete those first.`);
  await db.patient.delete({ where: { id } });
  return ok({ success: true });
}
