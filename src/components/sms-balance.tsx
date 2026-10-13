"use client";

import { useEffect, useState } from "react";
import { Wallet, RotateCw } from "lucide-react";

// Small badge with the remaining ADN SMS balance
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

    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
            title={d?.error || "ADN SMS balance"}
        >
            <Wallet size={13} />
            {loading ? "Checking balance..." : d?.balance != null ? `SMS Balance: ${d.balance}` : "Balance unavailable"}
            <button type="button" onClick={load} className="opacity-60 hover:opacity-100" aria-label="Refresh balance">
                <RotateCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
        </span>
    );
}
