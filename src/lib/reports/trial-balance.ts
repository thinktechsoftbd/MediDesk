import { db } from "@/lib/prisma";

// Hierarchical trial balance:
//   Parent class (ASSETS) > A/C class (CURRENT ASSET) > Ledger head (main class) > [patient]
// Amounts are signed Dr - Cr; credit balances come out negative.
export type TbNode = {
    key: string;
    level: number; // 0 parent, 1 ac class, 2 ledger head, 3 patient
    name: string;
    code?: string;
    opening: number;
    debit: number;
    credit: number;
    closing: number;
    children: TbNode[];
};

export type TbParams = {
    dateFrom?: string;
    dateTo?: string;
    postedOnly?: boolean;
    showPatients?: boolean;
    showZero?: boolean;
};

const ymdEnd = (s: string) => new Date(s + "T23:59:59.999");

export async function buildTrialBalance(p: TbParams) {
    const voucherWhere: any = {};
    if (p.postedOnly) voucherWhere.isPosted = "Y";
    if (p.dateTo) voucherWhere.voucherDate = { lte: ymdEnd(p.dateTo) };

    const lines = await db.accVoucherDetail.findMany({
        where: { voucher: { is: voucherWhere } },
        include: {
            voucher: { select: { voucherDate: true, payment: { select: { patient: { select: { id: true, name: true, patientNo: true } } } } } },
        },
    });

    const tree = await db.accAcParentClass.findMany({
        include: { acClasses: { include: { mainClasses: true } } },
    });

    const from = p.dateFrom ? new Date(p.dateFrom) : null;

    // per ledger head (and per patient inside it)
    type Acc = { opening: number; debit: number; credit: number; patients: Map<number, any> };
    const byHead = new Map<number, Acc>();
    for (const l of lines as any[]) {
        const a = byHead.get(l.accMainClassId) || { opening: 0, debit: 0, credit: 0, patients: new Map() };
        byHead.set(l.accMainClassId, a);
        const dr = Number(l.debit), cr = Number(l.credit);
        const isOpening = from && new Date(l.voucher.voucherDate) < from;
        const pt = l.voucher.payment?.patient;
        const pa = pt
            ? a.patients.get(pt.id) || { name: `${pt.name} (${pt.patientNo})`, opening: 0, debit: 0, credit: 0 }
            : null;
        if (pt) a.patients.set(pt.id, pa);
        if (isOpening) {
            a.opening += dr - cr;
            if (pa) pa.opening += dr - cr;
        } else {
            a.debit += dr; a.credit += cr;
            if (pa) { pa.debit += dr; pa.credit += cr; }
        }
    }

    const nonZero = (n: TbNode) =>
        p.showZero || Math.abs(n.opening) > 0.004 || Math.abs(n.debit) > 0.004 || Math.abs(n.credit) > 0.004;

    const sum = (key: string, level: number, name: string, children: TbNode[], code?: string): TbNode => {
        const n: TbNode = { key, level, name, code, opening: 0, debit: 0, credit: 0, closing: 0, children };
        for (const c of children) { n.opening += c.opening; n.debit += c.debit; n.credit += c.credit; }
        n.closing = n.opening + n.debit - n.credit;
        return n;
    };

    const byCode = (a?: string | null, b?: string | null) => String(a || "").localeCompare(String(b || ""));

    const roots: TbNode[] = tree
        .sort((a: any, b: any) => byCode(a.parentCode, b.parentCode))
        .map((pc: any) => {
            const acs = pc.acClasses
                .sort((a: any, b: any) => byCode(a.acCode, b.acCode))
                .map((ac: any) => {
                    const heads = ac.mainClasses
                        .sort((a: any, b: any) => (a.mcDisplayOrder ?? 0) - (b.mcDisplayOrder ?? 0) || byCode(a.mainCode, b.mainCode))
                        .map((mc: any) => {
                            const a = byHead.get(mc.id) || { opening: 0, debit: 0, credit: 0, patients: new Map() };
                            const kids: TbNode[] = p.showPatients
                                ? Array.from(a.patients.entries())
                                      .map(([id, x]: any) => ({
                                          key: `p${mc.id}-${id}`, level: 3, name: x.name,
                                          opening: x.opening, debit: x.debit, credit: x.credit,
                                          closing: x.opening + x.debit - x.credit, children: [],
                                      }))
                                      .filter(nonZero)
                                      .sort((x: TbNode, y: TbNode) => x.name.localeCompare(y.name))
                                : [];
                            const head: TbNode = {
                                key: `m${mc.id}`, level: 2, name: mc.mainName || "", code: mc.mainCode || "",
                                opening: a.opening, debit: a.debit, credit: a.credit,
                                closing: a.opening + a.debit - a.credit, children: kids,
                            };
                            return head;
                        })
                        .filter(nonZero);
                    return sum(`a${ac.id}`, 1, (ac.className || "").toUpperCase(), heads, ac.acCode || "");
                })
                .filter((n: TbNode) => n.children.length > 0 || p.showZero);
            return sum(`r${pc.id}`, 0, (pc.name || "").toUpperCase(), acs, pc.parentCode);
        })
        .filter((n: TbNode) => n.children.length > 0 || p.showZero);

    const total = sum("total", -1, "GRAND TOTAL", roots);
    return { roots, total };
}

export const fmtAmt = (n: number) => {
    const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < -0.004 ? `(${s})` : s;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtShort = (ymd?: string) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.slice(0, 10).split("-");
    return `${d}/${MON[Number(m) - 1]}/${y.slice(2)}`;
};
