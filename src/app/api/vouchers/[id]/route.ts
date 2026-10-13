import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const v = await db.accVoucher.findUnique({ where: { id: Number(params.id) }, include: {
    details: { include: { accMainClass: true }, orderBy: { id: "asc" } },
    payment: { include: { patient: true } },
  }});
  if (!v) return bad("Voucher not found", 404);
  return ok(v);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!Array.isArray(b?.details) || b.details.length < 2) return bad("A voucher needs at least two lines.");
  let dr = 0, cr = 0;
  for (const d of b.details) {
    if (!d.accMainClassId) return bad("Every line needs an account.");
    const debit = Number(d.debit || 0), credit = Number(d.credit || 0);
    if (debit < 0 || credit < 0) return bad("Amounts cannot be negative.");
    if (debit > 0 && credit > 0) return bad("A line cannot have both debit and credit.");
    if (debit === 0 && credit === 0) return bad("Every line needs a debit or credit amount.");
    dr += debit; cr += credit;
  }
  if (Math.abs(dr - cr) > 0.005) return bad(`Debit (${dr.toFixed(2)}) and credit (${cr.toFixed(2)}) must be equal.`);

  const id = Number(params.id);
  await db.accVoucherDetail.deleteMany({ where: { voucherId: id } });
  const v = await db.accVoucher.update({ where: { id }, data: {
    voucherDate: b.voucherDate ? new Date(b.voucherDate) : undefined,
    voucherType: b.voucherType || undefined,
    paymentMode: b.paymentMode || null,
    narration: b.narration?.trim() || null,
    updatedBy: session.user?.email || session.user?.name || null,
    details: { create: b.details.map((d: any) => ({
      accMainClassId: Number(d.accMainClassId),
      debit: Number(d.debit || 0),
      credit: Number(d.credit || 0),
      lineNarration: d.lineNarration?.trim() || null,
    })) },
  }, include: { details: { include: { accMainClass: true } } } });
  return ok(v);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const v = await db.accVoucher.findUnique({ where: { id: Number(params.id) } });
  if (!v) return bad("Voucher not found", 404);
  if (v.isPosted === "Y") return bad(`Cannot delete: voucher ${v.voucherNo} is posted. Unpost it first.`);
  // detail lines are owned by the voucher; the linked payment is released (unlocked)
  await db.accVoucher.delete({ where: { id: v.id } });
  return ok({ deleted: true });
}
