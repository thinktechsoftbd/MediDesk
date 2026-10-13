import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";

export const dynamic = "force-dynamic";

const TZ_OFFSET_MS = 6 * 60 * 60 * 1000; // clinic time: Asia/Dhaka (UTC+6, no DST)

// yyyy-mm-dd of a moment in clinic time
const dayKey = (d: Date) => new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

export async function GET() {
  if (!(await requireSession())) return bad("Unauthorized", 401);

  // today and this month, in clinic time
  const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
  const y = nowLocal.getUTCFullYear(), m = nowLocal.getUTCMonth(), dd = nowLocal.getUTCDate();
  const todayStart = new Date(Date.UTC(y, m, dd) - TZ_OFFSET_MS);
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const monthStart = new Date(Date.UTC(y, m, 1) - TZ_OFFSET_MS);
  const monthEnd = new Date(Date.UTC(y, m + 1, 1) - TZ_OFFSET_MS);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const [patients, cases, prescriptions, todayAppointments, todayPayments, recentPatients, monthPayments, monthPatients, monthFollowUps] =
    await Promise.all([
      db.patient.count({ where: { isActive: true } }),
      db.caseHistory.count(),
      db.prescription.count(),
      db.caseHistory.count({ where: { followUpDate: { gte: todayStart, lt: todayEnd } } }),
      db.payment.findMany({ where: { paymentDate: { gte: todayStart, lt: todayEnd } }, select: { paidAmount: true, type: true } }),
      db.patient.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      db.payment.findMany({ where: { paymentDate: { gte: monthStart, lt: monthEnd } }, select: { paymentDate: true, paidAmount: true, type: true } }),
      db.patient.findMany({ where: { admissionDate: { gte: monthStart, lt: monthEnd } }, select: { admissionDate: true } }),
      db.caseHistory.findMany({ where: { followUpDate: { gte: monthStart, lt: monthEnd } }, select: { followUpDate: true } }),
    ]);

  const signed = (p: any) => (p.type === "REFUND" ? -1 : 1) * Number(p.paidAmount || 0);

  // one bucket per day of the month
  const keys = Array.from({ length: daysInMonth }, (_, i) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
  );
  const series = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  const collection = series(), enrollment = series(), followUps = series();
  for (const p of monthPayments as any[]) collection[dayKey(p.paymentDate)] += signed(p);
  for (const p of monthPatients as any[]) enrollment[dayKey(p.admissionDate)] += 1;
  for (const c of monthFollowUps as any[]) followUps[dayKey(c.followUpDate)] += 1;
  const toList = (s: Record<string, number>) => keys.map((k) => ({ date: k, value: Math.round(s[k] * 100) / 100 }));

  return ok({
    patients,
    cases,
    prescriptions,
    todayAppointments,
    todayCollection: (todayPayments as any[]).reduce((s, p) => s + signed(p), 0),
    recentPatients,
    month: {
      label: new Date(Date.UTC(y, m, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      today: keys[dd - 1],
      collection: toList(collection),
      enrollment: toList(enrollment),
      followUps: toList(followUps),
    },
  });
}
