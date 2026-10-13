import { resolveAgreementId } from "@/lib/agreements";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const p = await db.payment.findUnique({ where: { id: Number(params.id) }, include: { patient: true } });
  return p ? ok(p) : bad("Invoice not found", 404);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.patientId || b.amount === undefined) return bad("Patient and amount are required.");
  const lockV = await db.accVoucher.findUnique({ where: { paymentId: Number(params.id) } });
  if (lockV) return bad(`Locked: journal voucher ${lockV.voucherNo} exists for this transaction. Delete the voucher first.`);
  const current: any = await db.payment.findUnique({ where: { id: Number(params.id) }, select: { agreementId: true } });
  const ag = await resolveAgreementId(Number(b.patientId), b.agreementId, current?.agreementId);
  if (ag.error) return bad(ag.error);
  try {
  const updated = await db.payment.update({ where: { id: Number(params.id) }, data: {
    patientId: Number(b.patientId), description: b.description || null,
    amount: Number(b.amount), discount: Number(b.discount || 0),
    paidAmount: Number(b.paidAmount ?? b.amount), type: b.type || "PAYMENT",
    method: b.method || "CASH",
    paymentDate: b.paymentDate ? new Date(b.paymentDate) : undefined,
    walletProvider: b.method === "MOBILE_BANKING" ? b.walletProvider || null : null,
    walletNumber: b.method === "MOBILE_BANKING" ? b.walletNumber || null : null,
    walletTrxId: b.method === "MOBILE_BANKING" ? b.walletTrxId || null : null,
    caseHistoryId: b.caseHistoryId ? Number(b.caseHistoryId) : null,
    agreementId: ag.id,
  }, include: { patient: true, caseHistory: true } });
  return ok(updated);
  } catch (e: any) {
    console.error("Payment update failed:", e);
    return bad("Update failed: " + (e?.message?.split("\n").pop()?.trim() || "unknown error"), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const lockV = await db.accVoucher.findUnique({ where: { paymentId: Number(params.id) } });
  if (lockV) return bad(`Locked: journal voucher ${lockV.voucherNo} exists for this transaction. Delete the voucher first.`);
  await db.payment.delete({ where: { id: Number(params.id) } });
  return ok({ deleted: true });
}
