import { db } from "@/lib/prisma";

// Balance sheet as of a date: assets vs liabilities + equity,
// with the income-expense result shown as current earnings.
export async function buildBalanceSheet({ asOf = "", postedOnly = false }: { asOf?: string; postedOnly?: boolean }) {
  const where: any = {};
  if (postedOnly || asOf) where.voucher = { is: {} };
  if (postedOnly) where.voucher.is.isPosted = "Y";
  if (asOf) where.voucher.is.voucherDate = { lte: new Date(asOf + "T23:59:59.999") };

  const rows = await db.accVoucherDetail.findMany({
    where,
    include: { accMainClass: { include: { acClass: { include: { parentClass: true } } } } },
  });

  const byAccount: Record<number, any> = {};
  for (const d of rows as any[]) {
    const a = byAccount[d.accMainClassId] ||= {
      code: d.accMainClass.mainCode,
      name: d.accMainClass.mainName,
      group: d.accMainClass.acClass?.parentClass?.name || "",
      debit: 0,
      credit: 0,
    };
    a.debit += Number(d.debit);
    a.credit += Number(d.credit);
  }

  const assets: any[] = [], liabilities: any[] = [], equity: any[] = [];
  let income = 0, expense = 0;

  for (const a of Object.values(byAccount) as any[]) {
    const net = a.debit - a.credit; // positive = debit balance
    if (a.group === "ASSETS") {
      if (net !== 0) assets.push({ code: a.code, name: a.name, amount: net });
    } else if (a.group === "LIABILITIES") {
      if (net !== 0) liabilities.push({ code: a.code, name: a.name, amount: -net });
    } else if (a.group === "EQUITY") {
      if (net !== 0) equity.push({ code: a.code, name: a.name, amount: -net });
    } else if (a.group === "INCOME") {
      income += -net;
    } else if (a.group === "EXPENDITURE") {
      expense += net;
    }
  }

  const currentEarnings = income - expense;
  const sort = (l: any[]) => l.sort((x, y) => String(x.code).localeCompare(String(y.code)));

  return {
    assets: sort(assets),
    liabilities: sort(liabilities),
    equity: sort(equity),
    currentEarnings,
    totals: {
      assets: assets.reduce((s, x) => s + x.amount, 0),
      liabilitiesEquity:
        liabilities.reduce((s, x) => s + x.amount, 0) +
        equity.reduce((s, x) => s + x.amount, 0) +
        currentEarnings,
    },
  };
}
