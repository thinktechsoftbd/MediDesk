import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

// Batch post or unpost vouchers. body: { ids: number[], action: "post" | "unpost" }
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  const ids: number[] = (b?.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return bad("No vouchers selected.");
  const user = session.user?.email || session.user?.name || null;

  if (b.action === "unpost") {
    await db.accVoucher.updateMany({ where: { id: { in: ids } }, data: { isPosted: "N", updatedBy: user } });
    return ok({ updated: ids.length });
  }

  if (b.action === "post") {
    // next posting sequence from the highest existing posting id
    const withPid = await db.accVoucher.findMany({
      where: { voucherPostingId: { not: null } },
      select: { voucherPostingId: true },
    });
    let seq = 0;
    for (const v of withPid) {
      const n = Number((v.voucherPostingId || "").replace(/\D/g, ""));
      if (!isNaN(n) && n > seq) seq = n;
    }
    const targets = await db.accVoucher.findMany({ where: { id: { in: ids } } });
    for (const v of targets) {
      await db.accVoucher.update({ where: { id: v.id }, data: {
        isPosted: "Y",
        postingDate: new Date(),
        voucherPostingId: v.voucherPostingId || `P-${pad(++seq, 6)}`,
        updatedBy: user,
      }});
    }
    return ok({ updated: targets.length });
  }

  return bad("Unknown action.");
}
