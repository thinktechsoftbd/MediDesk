// Shared filter for the follow-up list and the bulk SMS sender,
// so "All patients" always means exactly what the list shows.
export function followUpWhere(f: {
  patientId?: string | number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  includePast?: boolean;
  smsStatus?: string | null;
}) {
  const where: any = { followUpDate: { not: null } };
  const patientId = Number(f.patientId || 0);
  if (patientId) where.patientId = patientId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (f.dateFrom) where.followUpDate.gte = new Date(f.dateFrom);
  else if (!f.includePast) where.followUpDate.gte = today;
  if (f.dateTo) where.followUpDate.lte = new Date(f.dateTo + "T23:59:59.999");

  if (f.smsStatus === "sent") where.followUpSmsSentAt = { not: null };
  if (f.smsStatus === "pending") where.followUpSmsSentAt = null;
  return where;
}
