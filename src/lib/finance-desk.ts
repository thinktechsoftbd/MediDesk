import { db } from "@/lib/prisma";
import { agreementTotals } from "@/lib/agreements";
import { clinicToday, dayKey, monthKey, monthStartAt, signedPaid } from "@/lib/clinic-time";

// The signed-in user's Finance Desk: /finance-desk/{active organization object_id}/{user object_id}
// (the organization as on the sidebar: the first active one)
export async function financeDeskPath(userId: number) {
    const [org, user] = await Promise.all([
        db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { objectId: true } }),
        db.user.findUnique({ where: { id: userId }, select: { objectId: true } }),
    ]);
    return org && user ? `/finance-desk/${org.objectId}/${user.objectId}` : null;
}

const DAY = 86400000;
const round = (n: number) => Math.round(n * 100) / 100;
const METHODS: [string, string][] = [
    ["CASH", "Cash"],
    ["MOBILE_BANKING", "Mobile Banking"],
    ["CARD", "Card"],
    ["BANK", "Bank"],
    ["OTHER", "Other"],
];

// Finance Desk: collection cards, this month's daily collection, collection by payment method
// (last 30 days), monthly collection (last 12 months), and the recent pending collections,
// collections and vouchers. Collections are signed: refunds count against them.
export async function buildFinanceDesk() {
    const { y, m, d, start: todayStart } = clinicToday();
    const start7 = new Date(todayStart.getTime() - 6 * DAY); // today and the 6 days before
    const start30 = new Date(todayStart.getTime() - 29 * DAY);
    const monthStart = monthStartAt(y, m);
    const yearStart = monthStartAt(y, m - 11); // this month and the 11 before
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const since = yearStart < start30 ? yearStart : start30;

    const [payments, openAgreements, recentPayments, recentVouchers] = await Promise.all([
        db.payment.findMany({ where: { paymentDate: { gte: since } }, select: { paymentDate: true, paidAmount: true, type: true, method: true } }),
        db.patientXAgreement.findMany({
            where: { isClosed: "N" },
            orderBy: { openDate: "desc" },
            include: { patient: { select: { id: true, name: true, patientNo: true, phone: true } } },
        }),
        db.payment.findMany({
            take: 8,
            orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
            select: {
                id: true, paymentDate: true, paidAmount: true, discount: true, type: true, method: true,
                patient: { select: { id: true, name: true, patientNo: true } },
            },
        }),
        db.accVoucher.findMany({
            take: 8,
            orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
            select: { id: true, voucherNo: true, voucherDate: true, voucherType: true, isPosted: true, narration: true, details: { select: { debit: true } } },
        }),
    ]);

    // cards
    const sumFrom = (from: Date) => payments.reduce((s: number, p: any) => (p.paymentDate >= from ? s + signedPaid(p) : s), 0);

    // this month, one bar per day
    const dayKeys = Array.from({ length: daysInMonth }, (_, i) => `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
    const daily: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
    // last 12 months, one point per month
    const monthKeys = Array.from({ length: 12 }, (_, i) => monthKey(monthStartAt(y, m - 11 + i)));
    const monthly: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
    // last 30 days by payment method
    const byMethod: Record<string, number> = Object.fromEntries(METHODS.map(([k]) => [k, 0]));
    for (const p of payments as any[]) {
        const v = signedPaid(p);
        if (p.paymentDate >= monthStart) daily[dayKey(p.paymentDate)] += v;
        if (p.paymentDate >= yearStart) monthly[monthKey(p.paymentDate)] += v;
        if (p.paymentDate >= start30) byMethod[p.method] = (byMethod[p.method] || 0) + v;
    }

    // pending: running agreements with dues left, newest first
    const totals = await agreementTotals(openAgreements.map((a: any) => a.id));
    const pending = (openAgreements as any[])
        .map((a) => ({
            agreementId: a.id,
            openDate: a.openDate,
            patient: a.patient,
            serviceCharge: Number(a.serviceChargeAmount),
            collected: round(totals[a.id]?.collected || 0),
            discount: round(totals[a.id]?.discount || 0),
            dues: round(totals[a.id]?.dues ?? Number(a.serviceChargeAmount)),
        }))
        .filter((a) => a.dues > 0);

    return {
        cards: {
            today: round(sumFrom(todayStart)),
            last7: round(sumFrom(start7)),
            last30: round(sumFrom(start30)),
            pending: round(pending.reduce((s, a) => s + a.dues, 0)),
            pendingPatients: new Set(pending.map((a) => a.patient.id)).size,
        },
        month: {
            label: new Date(Date.UTC(y, m, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
            today: dayKeys[d - 1],
            collection: dayKeys.map((k) => ({ date: k, value: round(daily[k]) })),
        },
        byMethod: METHODS.map(([k, label]) => ({ key: k, label, value: round(byMethod[k] || 0) })).filter((x) => x.value > 0),
        monthly: monthKeys.map((k) => ({ month: k, value: round(monthly[k]) })),
        recentPending: pending.slice(0, 8),
        recentCollections: (recentPayments as any[]).map((p) => ({
            id: p.id,
            date: p.paymentDate,
            patient: p.patient,
            type: p.type,
            method: p.method,
            amount: round(signedPaid(p)),
            discount: round(Number(p.discount || 0)),
        })),
        recentVouchers: (recentVouchers as any[]).map((v) => ({
            id: v.id,
            voucherNo: v.voucherNo,
            date: v.voucherDate,
            type: v.voucherType,
            isPosted: v.isPosted === "Y",
            narration: v.narration,
            amount: round(v.details.reduce((s: number, x: any) => s + Number(x.debit || 0), 0)),
        })),
    };
}
