import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
import { generateVoucherForPayment } from "@/lib/vouchers";

// Finalize a bill collection transaction: create its journal voucher as an
// unposted draft. Refreshes the draft if it already exists and is unposted.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const id = Number(params.id);
  const existing = await db.accVoucher.findUnique({ where: { paymentId: id } });
  if (existing?.isPosted === "Y") return bad("Voucher is already posted. Unpost it first.");
  try {
    const v = await generateVoucherForPayment(id, session.user?.email || session.user?.name);
    if (!v) return bad("Nothing to finalize: paid amount must be greater than zero.");
    return ok(v);
  } catch (e: any) {
    console.error("Finalize failed:", e);
    return bad("Finalize failed: " + (e?.message?.split("\n").pop() || "unknown error"), 500);
  }
}
