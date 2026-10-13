"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { medicineLabel } from "@/lib/medicine-label";

// Server-side search over the medicine master (thousands of brands)
export default function MedicinePicker({
    value,
    label,
    onChange,
    required,
}: {
    value: string;
    label: string;
    onChange: (id: string, label: string, medicine?: any) => void;
    required?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const timer = useRef<any>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    useEffect(() => {
        if (!open) return;
        if (timer.current) clearTimeout(timer.current);
        setLoading(true);
        timer.current = setTimeout(() => {
            fetch(`/api/medicines?limit=30&q=${encodeURIComponent(q.trim())}`)
                .then((r) => r.json())
                .then((d) => setItems(Array.isArray(d) ? d : []))
                .catch(() => setItems([]))
                .finally(() => setLoading(false));
        }, 250);
        return () => timer.current && clearTimeout(timer.current);
    }, [q, open]);

    return (
        <div className="relative" ref={ref}>
            <input
                className="input"
                placeholder="Search brand or generic name..."
                value={open ? q : label}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                    setQ("");
                    setOpen(true);
                }}
                required={required && !value}
            />
            {open && (
                <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                    {loading && (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                            <Loader2 size={14} className="animate-spin" /> Searching...
                        </div>
                    )}
                    {!loading &&
                        items.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className={`block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                                    String(m.id) === value ? "bg-teal-50 font-medium text-teal-700" : ""
                                }`}
                                onClick={() => {
                                    onChange(String(m.id), medicineLabel(m), m);
                                    setOpen(false);
                                }}
                            >
                                <div>{medicineLabel(m)}</div>
                                {(m.genericName || m.company) && (
                                    <div className="text-xs text-slate-500">
                                        {[m.genericName, m.company].filter(Boolean).join(" · ")}
                                    </div>
                                )}
                            </button>
                        ))}
                    {!loading && items.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No match found</div>}
                </div>
            )}
        </div>
    );
}
