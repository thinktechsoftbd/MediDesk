// Clinic time: Asia/Dhaka (UTC+6, no DST). Days and months on the dashboards are clinic days.
export const TZ_OFFSET_MS = 6 * 60 * 60 * 1000;

// yyyy-mm-dd of a moment in clinic time
export const dayKey = (d: Date) => new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

// yyyy-mm of a moment in clinic time
export const monthKey = (d: Date) => dayKey(d).slice(0, 7);

// today in clinic time: its date parts and the moment it started
export function clinicToday() {
    const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
    const y = nowLocal.getUTCFullYear(), m = nowLocal.getUTCMonth(), d = nowLocal.getUTCDate();
    return { y, m, d, start: new Date(Date.UTC(y, m, d) - TZ_OFFSET_MS) };
}

// the moment a clinic month starts (m may run past 0..11)
export const monthStartAt = (y: number, m: number) => new Date(Date.UTC(y, m, 1) - TZ_OFFSET_MS);

// signed collection: refunds count against it
export const signedPaid = (p: { type: string; paidAmount: any }) => (p.type === "REFUND" ? -1 : 1) * Number(p.paidAmount || 0);
