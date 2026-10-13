import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
export async function GET() {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const start = new Date(); start.setHours(0,0,0,0);
  const [patients, cases, prescriptions, todayAppointments, paymentAgg, recentPatients] = await Promise.all([
    db.patient.count({ where: { isActive: true } }),
    db.caseHistory.count(),
    db.prescription.count(),
    db.caseHistory.count({ where: { followUpDate: { gte: start, lt: new Date(start.getTime()+86400000) } } }),
    db.payment.aggregate({ _sum: { paidAmount: true }, where: { paymentDate: { gte: start } } }),
    db.patient.findMany({ take: 8, orderBy: { createdAt: "desc" } })
  ]);
  return ok({ patients, cases, prescriptions, todayAppointments, todayCollection: Number(paymentAgg._sum.paidAmount || 0), recentPatients });
}
