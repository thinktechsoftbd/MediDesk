import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
import { clinicToday, dayKey, monthStartAt } from "@/lib/clinic-time";

export const dynamic = "force-dynamic";

// Collections moved to the Finance Desk (/api/finance-desk)
export async function GET() {
  if (!(await requireSession())) return bad("Unauthorized", 401);

  // today and this month, in clinic time
  const { y, m, d: dd, start: todayStart } = clinicToday();
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const monthStart = monthStartAt(y, m);
  const monthEnd = monthStartAt(y, m + 1);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const [patients, cases, prescriptions, todayAppointments, recentPatients, monthPatients, monthFollowUps] =
    await Promise.all([
      db.patient.count({ where: { isActive: true } }),
      db.caseHistory.count(),
      db.prescription.count(),
      db.caseHistory.count({ where: { followUpDate: { gte: todayStart, lt: todayEnd } } }),
      db.patient.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      db.patient.findMany({ where: { admissionDate: { gte: monthStart, lt: monthEnd } }, select: { admissionDate: true } }),
      db.caseHistory.findMany({ where: { followUpDate: { gte: monthStart, lt: monthEnd } }, select: { followUpDate: true } }),
    ]);

  // one bucket per day of the month
  const keys = Array.from({ length: daysInMonth }, (_, i) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
  );
  const series = () => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
  const enrollment = series(), followUps = series();
  for (const p of monthPatients as any[]) enrollment[dayKey(p.admissionDate)] += 1;
  for (const c of monthFollowUps as any[]) followUps[dayKey(c.followUpDate)] += 1;
  const toList = (s: Record<string, number>) => keys.map((k) => ({ date: k, value: Math.round(s[k] * 100) / 100 }));

  return ok({
    patients,
    cases,
    prescriptions,
    todayAppointments,
    recentPatients,
    month: {
      label: new Date(Date.UTC(y, m, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      today: keys[dd - 1],
      enrollment: toList(enrollment),
      followUps: toList(followUps),
    },
  });
}
