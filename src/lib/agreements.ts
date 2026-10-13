import { db } from "@/lib/prisma";

// Collected / discount / dues for each agreement (refunds add back to dues)
export async function agreementTotals(ids: number[]) {
    const out: Record<number, { collected: number; discount: number; dues: number }> = {};
    if (!ids.length) return out;
    const [rows, agreements] = await Promise.all([
        db.payment.groupBy({
            by: ["agreementId", "type"],
            where: { agreementId: { in: ids } },
            _sum: { paidAmount: true, discount: true },
        }),
        db.patientXAgreement.findMany({ where: { id: { in: ids } }, select: { id: true, serviceChargeAmount: true } }),
    ]);
    for (const a of agreements as any[]) out[a.id] = { collected: 0, discount: 0, dues: Number(a.serviceChargeAmount) };
    for (const r of rows as any[]) {
        const t = out[r.agreementId];
        if (!t) continue;
        const paid = Number(r._sum.paidAmount || 0);
        if (r.type === "REFUND") t.collected -= paid;
        else {
            t.collected += paid;
            t.discount += Number(r._sum.discount || 0);
        }
    }
    for (const id of Object.keys(out)) {
        const t = out[Number(id)];
        const a: any = (agreements as any[]).find((x) => x.id === Number(id));
        t.dues = Number(a.serviceChargeAmount) - t.collected - t.discount;
    }
    return out;
}

// Attach `agreement` (the running one, with totals) to each patient row
export async function withRunningAgreement<T extends { id: number }>(patients: T[]) {
    const ids = patients.map((p) => p.id);
    if (!ids.length) return patients as (T & { agreement: any })[];
    const open = await db.patientXAgreement.findMany({
        where: { patientId: { in: ids }, isClosed: "N" },
        orderBy: { openDate: "desc" },
    });
    const totals = await agreementTotals(open.map((a: any) => a.id));
    return patients.map((p) => {
        const a: any = (open as any[]).find((x) => x.patientId === p.id);
        return { ...p, agreement: a ? { ...a, serviceChargeAmount: Number(a.serviceChargeAmount), ...totals[a.id] } : null };
    });
}

export const actor = (session: any) => session?.user?.name || session?.user?.email || null;

// Agreement a bill collection should be linked to.
// Given id: must belong to the patient and be running (or be the one the payment already had).
// No id: the patient's running agreement, if any.
export async function resolveAgreementId(patientId: number, agreementId: any, currentId?: number | null) {
    if (agreementId) {
        const id = Number(agreementId);
        const a: any = await db.patientXAgreement.findUnique({ where: { id } });
        if (!a || a.patientId !== patientId) return { error: "The selected agreement does not belong to this patient." };
        if (a.isClosed === "Y" && id !== currentId) return { error: "The selected agreement is closed. Choose the running agreement." };
        return { id };
    }
    const running: any = await db.patientXAgreement.findFirst({
        where: { patientId, isClosed: "N" },
        orderBy: { openDate: "desc" },
    });
    return { id: running?.id ?? null };
}
