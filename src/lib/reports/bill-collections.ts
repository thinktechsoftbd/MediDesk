import { db } from "@/lib/prisma";

export type BillCollectionParams = { patientId?: number; dateFrom?: string; dateTo?: string; runningOnly?: boolean };

// Rows come from the database procedure sp_bill_collection_report
// (prisma/sql/patient_x_agreement.sql).
export async function buildBillCollections(p: BillCollectionParams) {
    const rows: any[] = await db.$queryRaw`
        SELECT * FROM sp_bill_collection_report(
            ${p.patientId || null}::int,
            ${p.dateFrom || null}::date,
            ${p.dateTo || null}::date,
            ${p.runningOnly !== false}::boolean
        )`;
    const items = rows.map((r) => ({
        paymentId: r.payment_id,
        collectionDate: r.collection_date,
        patientId: r.patient_id,
        patientNo: r.patient_no,
        patientName: r.patient_name,
        agreementId: r.agreement_id,
        agreementOpenDate: r.agreement_open_date,
        isClosed: r.is_closed,
        totalServiceCharge: Number(r.total_service_charge),
        collectedAmount: Number(r.collected_amount),
        discount: Number(r.discount),
        totalDues: Number(r.total_dues),
    }));
    const totals = items.reduce(
        (s, x) => ({ collected: s.collected + x.collectedAmount, discount: s.discount + x.discount }),
        { collected: 0, discount: 0 }
    );
    return { items, totals };
}

export function paramsFrom(sp: URLSearchParams): BillCollectionParams {
    return {
        patientId: Number(sp.get("patientId") || 0) || undefined,
        dateFrom: sp.get("dateFrom")?.trim() || undefined,
        dateTo: sp.get("dateTo")?.trim() || undefined,
        runningOnly: sp.get("runningOnly") !== "0",
    };
}
