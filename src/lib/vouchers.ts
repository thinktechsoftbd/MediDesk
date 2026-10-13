import { db } from "@/lib/prisma";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

// find a posting account by main code, create it under the given AC class if missing
async function ensureMainClass(mainCode: string, name: string, acClassId: number) {
  const found = await db.accMainClass.findFirst({ where: { mainCode } });
  if (found) return found;
  const parent = await db.accAcClass.findUnique({ where: { id: acClassId } });
  return db.accMainClass.create({ data: {
    acCode: parent?.acCode || null, mainCode, mainName: name, acClassId,
  }});
}

// Create or refresh the journal voucher for a Bill Collection payment.
// Dr cash/bank for the paid amount, Cr income (PAYMENT), advance liability (ADVANCE),
// or the reverse for REFUND.
export async function generateVoucherForPayment(paymentId: number, user?: string | null) {
  const p = await db.payment.findUnique({ where: { id: paymentId }, include: { patient: true } });
  if (!p) return null;

  const paid = Number(p.paidAmount);
  if (!paid || paid <= 0) return null;

  const cash = await ensureMainClass("10204", "Cash-in-Hand", 2);
  const bank = await ensureMainClass("10208", "Cash At Bank", 2);
  const income = await ensureMainClass("40101", "Operating Revenue", 6);
  const advance = await ensureMainClass("20210", "Patient Advance", 5);

  const cashAccount = p.method === "CASH" ? cash : bank;
  const creditAccount = p.type === "ADVANCE" ? advance : income;

  const lines =
    p.type === "REFUND"
      ? [
          { accMainClassId: creditAccount.id, debit: paid, credit: 0, lineNarration: "Refund to patient" },
          { accMainClassId: cashAccount.id, debit: 0, credit: paid, lineNarration: `Paid by ${p.method}` },
        ]
      : [
          { accMainClassId: cashAccount.id, debit: paid, credit: 0, lineNarration: `Received by ${p.method}` },
          { accMainClassId: creditAccount.id, debit: 0, credit: paid, lineNarration: p.type === "ADVANCE" ? "Advance from patient" : "Fee income" },
        ];

  const narration = `${p.type === "REFUND" ? "Refund to" : p.type === "ADVANCE" ? "Advance from" : "Fees collection from"} ${p.patient.name} (${p.invoiceNo})`;

  const isCash = p.method === "CASH";
  const voucherType =
    p.type === "REFUND"
      ? (isCash ? "Cash Payment" : "Bank Payment")
      : (isCash ? "Cash Receive" : "Bank Receive");
  const paymentMode =
    p.method === "CASH" ? "Cash"
    : p.method === "MOBILE_BANKING" ? "Wallet Transfer"
    : p.method === "BANK" || p.method === "CARD" ? "Account Transfer"
    : "Cash";

  const existing = await db.accVoucher.findUnique({ where: { paymentId: p.id } });

  if (existing) {
    await db.accVoucherDetail.deleteMany({ where: { voucherId: existing.id } });
    return db.accVoucher.update({ where: { id: existing.id }, data: {
      voucherDate: p.paymentDate, narration,
      voucherType, paymentMode,
      updatedBy: user || null,
      details: { create: lines },
    }, include: { details: true } });
  }

  return db.$transaction(async (tx: any) => {
    const v = await tx.accVoucher.create({ data: {
      voucherNo: `TMP-${Date.now()}`,
      voucherDate: p.paymentDate, narration,
      voucherType, paymentMode, isPosted: "N",
      paymentId: p.id, createdBy: user || null,
      details: { create: lines },
    }});
    return tx.accVoucher.update({ where: { id: v.id }, data: { voucherNo: `JV-${pad(v.id, 6)}` } });
  });
}
