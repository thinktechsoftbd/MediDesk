import { db } from "@/lib/prisma";
import { bkashExecutePayment, bkashQueryPayment } from "@/lib/bkash";

export const dynamic = "force-dynamic";

// bKash redirects the payer here after the checkout page.
// No session required: verification happens server-to-server via execute.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const paymentID = sp.get("paymentID") || "";
  const status = sp.get("status") || "";
  const home = `${process.env.NEXTAUTH_URL}/payments`;

  const back = (q: string) => Response.redirect(`${home}?${q}`, 302);

  if (!paymentID) return back("bkash=failure&reason=missing-paymentID");

  const payment = await db.payment.findFirst({ where: { bkashPaymentId: paymentID } });
  if (!payment) return back("bkash=failure&reason=unknown-payment");

  if (status !== "success") {
    return back(`bkash=${status === "cancel" ? "cancel" : "failure"}`);
  }

  try {
    let d = await bkashExecutePayment(paymentID);

    // execute can time out on bKash's side — query to confirm before failing
    if (!d?.trxID) {
      const q: any = await bkashQueryPayment(paymentID);
      if (q?.trxID && q?.transactionStatus === "Completed") d = q;
    }

    if (d?.trxID && d.statusCode === "0000") {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          walletTrxId: d.trxID,
          walletNumber: d.customerMsisdn || payment.walletNumber,
        },
      });
      return back(`bkash=success&trx=${encodeURIComponent(d.trxID)}`);
    }

    return back(`bkash=failure&reason=${encodeURIComponent(d?.statusMessage || d?.statusCode || "execute-failed")}`);
  } catch (e: any) {
    return back(`bkash=failure&reason=${encodeURIComponent(e?.message || "error")}`);
  }
}
