import { db } from "@/lib/prisma";

// Subsidiary ledger: voucher lines filtered by patient and/or ledger head
// (main class), plus date range. Returns null when neither is given.
export async function buildLedger(sp: URLSearchParams) {
  const patientId = Number(sp.get("patientId") || 0);
  const accountId = Number(sp.get("accountId") || 0);
  if (!patientId && !accountId) return null;
  const dateFrom = sp.get("dateFrom")?.trim() || "";
  const dateTo = sp.get("dateTo")?.trim() || "";
  const postedOnly = sp.get("postedOnly") === "1";

  const where: any = { voucher: { is: patientId ? { payment: { is: { patientId } } } : {} } };
  if (accountId) where.accMainClassId = accountId;
  if (postedOnly) where.voucher.is.isPosted = "Y";
  if (dateFrom || dateTo) {
    where.voucher.is.voucherDate = {};
    if (dateFrom) where.voucher.is.voucherDate.gte = new Date(dateFrom);
    if (dateTo) where.voucher.is.voucherDate.lte = new Date(dateTo + "T23:59:59.999");
  }

  const rows = await db.accVoucherDetail.findMany({
    where,
    include: {
      accMainClass: true,
      voucher: { include: { payment: { include: { patient: true } } } },
    },
    orderBy: [{ voucher: { voucherDate: "asc" } }, { id: "asc" }],
  });

  const patient = patientId ? await db.patient.findUnique({ where: { id: patientId } }) : null;
  const head = accountId ? await db.accMainClass.findUnique({ where: { id: accountId } }) : null;

  return {
    patient: patient ? { id: patient.id, name: patient.name, patientNo: patient.patientNo, phone: patient.phone } : null,
    head: head ? `${head.mainCode} — ${head.mainName}` : null,
    rows: rows.map((d: any) => ({
      patient: d.voucher.payment?.patient ? `${d.voucher.payment.patient.name} (${d.voucher.payment.patient.patientNo})` : "",
      date: d.voucher.voucherDate,
      voucherNo: d.voucher.voucherNo,
      isPosted: d.voucher.isPosted,
      account: `${d.accMainClass.mainCode} — ${d.accMainClass.mainName}`,
      narration: d.lineNarration || d.voucher.narration || "",
      debit: Number(d.debit),
      credit: Number(d.credit),
    })),
  };
}
