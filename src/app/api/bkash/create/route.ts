import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { bkashConfigured, bkashCreatePayment } from "@/lib/bkash";

export const dynamic = "force-dynamic";

// Start a bKash checkout for a bill collection transaction.
export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  if (!bkashConfigured()) {
    return bad("bKash is not configured. Set BKASH_* variables in .env and restart.");
  }
  const b = await parseBody(req);
  const p = await db.payment.findUnique({ where: { id: Number(b?.id || 0) }, include: { patient: true } });
  if (!p) return bad("Transaction not found", 404);
  if (p.walletTrxId) return bad("This transaction already has a wallet TrxID.");
  const amount = Number(p.paidAmount);
  if (!amount || amount <= 0) return bad("Paid amount must be greater than zero to collect via bKash.");

  try {
    const created = await bkashCreatePayment({
      amount,
      invoice: p.invoiceNo.slice(0, 30),
      payerReference: p.walletNumber || p.patient.phone || "01",
      callbackURL: `${process.env.NEXTAUTH_URL}/api/bkash/callback`,
    });

    await db.payment.update({
      where: { id: p.id },
      data: { method: "MOBILE_BANKING", walletProvider: "bKash", bkashPaymentId: created.paymentID },
    });

    return ok({ bkashURL: created.bkashURL, paymentID: created.paymentID });
  } catch (e: any) {
    return bad(e?.message || "bKash create failed", 502);
  }
}
