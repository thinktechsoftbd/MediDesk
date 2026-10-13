"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { useCan } from "./permissions-context";

// Server-side patient autocomplete. Picking a patient opens their case
// history; no match offers registering them as a new patient.
export default function PatientSearch({
    placeholder = "Search patient by name, phone or patient no...",
    className = "",
}: {
    placeholder?: string;
    className?: string;
}) {
    const router = useRouter();
    const can = useCan();
    const [q, setQ] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const boxRef = useRef<HTMLDivElement>(null);
    const timer = useRef<any>(null);

    // close when clicking outside
    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    // debounced server-side lookup
    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        const s = q.trim();
        if (!s) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        timer.current = setTimeout(async () => {
            try {
                const r = await fetch(
                    `/api/patients?q=${encodeURIComponent(s)}&page=1&pageSize=8`
                );
                const d = await r.json();
                setItems(d.items || []);
                setActive(-1);
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => timer.current && clearTimeout(timer.current);
    }, [q]);

    const goPatient = (p: any) => {
        setOpen(false);
        setQ("");
        router.push(`/cases/patient/${p.id}`);
    };

    const goNew = () => {
        setOpen(false);
        const name = q.trim();
        setQ("");
        router.push(`/patients?new=1&name=${encodeURIComponent(name)}`);
    };

    const showNew = !loading && q.trim() !== "" && can("PATIENT.C");

    const onKey = (e: React.KeyboardEvent) => {
        if (!open) return;
        const last = items.length - (showNew ? 0 : 1);
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, last));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (active >= 0 && active < items.length) goPatient(items[active]);
            else if (active === items.length && showNew) goNew();
            else if (items.length > 0) goPatient(items[0]);
            else if (showNew) goNew();
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className={`relative ${className}`} ref={boxRef}>
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Search size={16} />
                )}
            </div>

            <input
                className="input !pl-9"
                placeholder={placeholder}
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => q.trim() && setOpen(true)}
                onKeyDown={onKey}
            />

            {open && q.trim() && (
                <div className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                    {items.map((p, i) => (
                        <button
                            key={p.id}
                            type="button"
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-teal-50 ${
                                i === active ? "bg-teal-50" : ""
                            }`}
                            onClick={() => goPatient(p)}
                        >
                            <span>
                                <span className="font-medium">{p.name}</span>

                                <span className="ml-2 text-xs text-slate-500">
                                    {p.patientNo}
                                </span>
                            </span>

                            <span className="text-xs text-slate-500">
                                {p.phone}
                            </span>
                        </button>
                    ))}

                    {!loading && items.length === 0 && (
                        <div className="px-3 py-2.5 text-sm text-slate-500">
                            No patient found
                        </div>
                    )}

                    {showNew && (
                        <button
                            type="button"
                            className={`flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium text-teal-700 hover:bg-teal-50 ${
                                active === items.length ? "bg-teal-50" : ""
                            }`}
                            onClick={goNew}
                        >
                            <UserPlus size={15} />
                            Register "{q.trim()}" as new patient
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
