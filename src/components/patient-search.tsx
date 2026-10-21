"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Loader2, ReceiptText, FolderOpen, Wallet, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { useCan } from "./permissions-context";

// Server-side patient autocomplete. Picking a patient opens the prescription
// page of their open case (a new case for today when none is open), or first the
// Update Patient popup when they have no running service charge agreement; row icons
// open a new bill collection, their bill collections or case history.
// No match offers registering them as a new patient.
export default function PatientSearch({
    placeholder = "Search patient by name, phone or patient no...",
    className = "",
    autoFocus = false,
}: {
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
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

    const go = (url: string) => {
        setOpen(false);
        setQ("");
        router.push(url);
    };

    // existing patient -> prescription of their open case (or a new case for today);
    // no running agreement -> Update Patient popup to enter it, then a new case's prescription
    const [opening, setOpening] = useState<number | null>(null);
    const goPatient = async (p: any) => {
        if (opening) return;
        if (!p.agreement && can("PATIENT.E")) {
            goPatients(`edit=${p.id}&rx=1`);
            return;
        }
        setOpening(p.id);
        const r = await fetch(`/api/patients/${p.id}/rx-case`, { method: "POST" });
        const d = await r.json().catch(() => null);
        setOpening(null);
        if (r.ok && d?.id) {
            if (d.created) toast.success(`New case opened for ${p.name}`);
            go(`/cases/${d.id}/prescription`);
        } else {
            if (!r.ok) toast.error(d?.error || "Could not open the prescription.");
            else toast("No open case, and you may not open one. Showing the case history.", { icon: "ℹ️" });
            go(`/cases/patient/${p.id}`);
        }
    };

    // open a popup on the Patients page; it watches its URL, so this also works on that page
    const goPatients = (query: string) => go(`/patients?${query}`);

    const goNew = () => goPatients(`new=1&name=${encodeURIComponent(q.trim())}`);

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
                autoFocus={autoFocus}
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
                        <div
                            key={p.id}
                            role="button"
                            tabIndex={-1}
                            className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-teal-50 ${
                                i === active ? "bg-teal-50" : ""
                            }`}
                            onClick={() => goPatient(p)}
                            title="Write prescription"
                        >
                            <span className="min-w-0 truncate">
                                {opening === p.id && <Loader2 size={14} className="mr-1.5 inline animate-spin text-teal-700" />}
                                <span className="font-medium">{p.name}</span>
                                <span className="ml-2 text-xs text-slate-500">{p.patientNo}</span>
                            </span>

                            <span className="flex shrink-0 items-center gap-1">
                                <span className="mr-1 text-xs text-slate-500">{p.phone}</span>
                                {can("PAYMENT.C") && (
                                    <button
                                        type="button"
                                        className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            go(`/payments?patientId=${p.id}`);
                                        }}
                                        title="New bill collection"
                                        aria-label="New bill collection"
                                    >
                                        <Wallet size={15} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goPatients(`edit=${p.id}`);
                                    }}
                                    title="Patient details"
                                    aria-label="Patient details"
                                >
                                    <UserCog size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 text-indigo-700 hover:bg-indigo-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        go(`/accounting/reports/bill-collections?patientId=${p.id}`);
                                    }}
                                    title="Bill collections"
                                    aria-label="Bill collections"
                                >
                                    <ReceiptText size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        go(`/cases/patient/${p.id}`);
                                    }}
                                    title="Case history"
                                    aria-label="Case history"
                                >
                                    <FolderOpen size={15} />
                                </button>
                            </span>
                        </div>
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
