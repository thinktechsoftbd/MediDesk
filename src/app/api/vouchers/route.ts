import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const where: any = {};
  if (q) where.OR = [
    { voucherNo: { contains: q, mode: "insensitive" } },
    { voucherPostingId: { contains: q, mode: "insensitive" } },
    { narration: { contains: q, mode: "insensitive" } },
  ];
  const voucherType = sp.get("voucherType")?.trim() ?? "";
  if (voucherType) where.voucherType = voucherType;
  const isPosted = sp.get("isPosted")?.trim() ?? "";
  if (isPosted) where.isPosted = isPosted;
  const patientId = Number(sp.get("patientId") || 0);
  if (patientId) where.payment = { is: { patientId } };
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
  const include = {
    details: { include: { accMainClass: true } },
    payment: { include: { patient: true } },
  };
  const [items, total] = await Promise.all([
    db.accVoucher.findMany({ where, include, orderBy: { id: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.accVoucher.count({ where }),
  ]);
  return ok({ items, total, page, pageSize });
}

export async function POST(req: Request) {
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

  const v = await db.$transaction(async (tx: any) => {
    const created = await tx.accVoucher.create({ data: {
      voucherNo: `TMP-${Date.now()}`,
      voucherDate: b.voucherDate ? new Date(b.voucherDate) : new Date(),
      voucherType: b.voucherType || "Journal",
      paymentMode: b.paymentMode || null,
      narration: b.narration?.trim() || null,
      isPosted: "N",
      createdBy: session.user?.email || session.user?.name || null,
      details: { create: b.details.map((d: any) => ({
        accMainClassId: Number(d.accMainClassId),
        debit: Number(d.debit || 0),
        credit: Number(d.credit || 0),
        lineNarration: d.lineNarration?.trim() || null,
      })) },
    }});
    return tx.accVoucher.update({ where: { id: created.id }, data: { voucherNo: `JV-${pad(created.id, 6)}` }, include: { details: true } });
  });
  return ok(v, 201);
}
