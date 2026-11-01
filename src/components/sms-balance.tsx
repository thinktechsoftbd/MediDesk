"use client";

import { useEffect, useState } from "react";
import { Wallet, RotateCw } from "lucide-react";

const n = (x: number) => Number(x).toLocaleString("en-US");

// Small badge with the SMS left: the clinic's ThinkTech ERP allocation less what it has sent, or
// the ADN SMS account balance when no ERP is configured
export default function SmsBalance({ refreshKey = 0 }: { refreshKey?: number }) {
    const [d, setD] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        fetch("/api/sms/balance")
            .then((r) => r.json())
            .then(setD)
            .catch(() => setD(null))
            .finally(() => setLoading(false));
    };

    useEffect(load, [refreshKey]);

    if (d && d.configured === false)
        return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">SMS gateway not configured</span>;

    const empty = d?.balance != null && d.balance <= 0;
    const title =
        d?.error ||
        (d?.source === "erp" && d?.balance != null
            ? `Allocated ${n(d.allocated)} · Sent ${n(d.used)} · Left ${n(d.balance)}`
            : "ADN SMS balance");

    return (
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
            {d?.source === "erp" && d.gateway === false && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">SMS gateway not configured</span>
            )}
            <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    empty ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"
                }`}
                title={title}
            >
                <Wallet size={13} />
                {loading ? "Checking balance..." : d?.balance != null ? `SMS Balance: ${n(d.balance)}` : "Balance unavailable"}
                <button type="button" onClick={load} className="opacity-60 hover:opacity-100" aria-label="Refresh balance">
                    <RotateCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </span>
        </span>
    );
}
