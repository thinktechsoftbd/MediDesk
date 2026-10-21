"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/components/ui";

// Add Medicine popup: commonly used drugs on the left, search on the right,
// the Rx so far below the search. Picking a medicine hands it to onPick; the page
// adds it straight away (saved defaults) or opens the dose editor.
export default function AddMedicineModal({
    open,
    onClose,
    onPick,
    common,
    children,
}: {
    open: boolean;
    onClose: () => void;
    onPick: (medicine: any) => void;
    common: any[];
    children: React.ReactNode; // the current Rx list
}) {
    const [q, setQ] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const [adding, setAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timer = useRef<any>(null);

    useEffect(() => {
        if (!open) return;
        setQ("");
        setItems([]);
        setAdding(false);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (timer.current) clearTimeout(timer.current);
        const term = q.trim();
        if (!term) {
            setItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        timer.current = setTimeout(() => {
            fetch(`/api/medicines?limit=30&q=${encodeURIComponent(term)}`)
                .then((r) => r.json())
                .then((d) => {
                    const list = Array.isArray(d) ? d : [];
                    // brand names starting with the typed text first
                    const t = term.toLowerCase();
                    list.sort((a, b) => Number(!a.name.toLowerCase().startsWith(t)) - Number(!b.name.toLowerCase().startsWith(t)));
                    setItems(list);
                    setActive(0);
                })
                .catch(() => setItems([]))
                .finally(() => setLoading(false));
        }, 200);
        return () => timer.current && clearTimeout(timer.current);
    }, [q, open]);

    const pick = (m: any) => {
        onPick(m);
        setQ("");
        setItems([]);
        inputRef.current?.focus();
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (!items.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (items[active]) pick(items[active]);
        } else if (e.key === "Escape") {
            setQ("");
        }
    };

    return (
        <Modal open={open} wide title="Add Medicine" onClose={onClose}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="min-w-0">
                    <div className="mb-1.5 text-sm font-medium text-slate-700">Commonly used drugs</div>
                    <div className="max-h-[55vh] overflow-y-auto rounded-xl border p-2 text-sm">
                        {common.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                className="block w-full rounded px-1.5 py-1 text-left text-teal-800 hover:bg-teal-50"
                                onClick={() => pick(m)}
                            >
                                • {m.name}{" "}
                                <span className="text-xs text-slate-500">
                                    ({[m.dosageForm, m.strength].filter(Boolean).join(", ")})
                                </span>
                            </button>
                        ))}
                        {!common.length && <div className="p-2 text-slate-500">Medicines you prescribe will show here.</div>}
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Medicine</span>
                        <span className="text-slate-500">
                            Medicine missing?{" "}
                            <button type="button" className="font-medium text-teal-700 hover:underline" onClick={() => setAdding(true)}>
                                Add
                            </button>
                        </span>
                    </div>

                    {adding ? (
                        <NewMedicineForm
                            initialName={q}
                            onCancel={() => setAdding(false)}
                            onCreated={(m) => {
                                setAdding(false);
                                pick(m);
                            }}
                        />
                    ) : (
                        <div className="relative">
                            <input
                                ref={inputRef}
                                className="input"
                                placeholder="Type medicine name... (↑ ↓ Enter)"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={onKey}
                            />
                            {q.trim() && (
                                <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                                    {loading && (
                                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                                            <Loader2 size={14} className="animate-spin" /> Searching...
                                        </div>
                                    )}
                                    {!loading &&
                                        items.map((m, i) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className={`block w-full px-3 py-2 text-left text-sm ${i === active ? "bg-teal-50" : "hover:bg-teal-50"}`}
                                                onMouseEnter={() => setActive(i)}
                                                onClick={() => pick(m)}
                                            >
                                                <div>
                                                    <b>{m.name}</b> {m.strength}{" "}
                                                    <span className="text-slate-500">{m.dosageForm ? `(${m.dosageForm})` : ""}</span>
                                                </div>
                                                {(m.genericName || m.company) && (
                                                    <div className="text-xs text-slate-500">{[m.genericName, m.company].filter(Boolean).join(" · ")}</div>
                                                )}
                                            </button>
                                        ))}
                                    {!loading && !items.length && (
                                        <div className="px-3 py-2 text-sm text-slate-500">
                                            No match.{" "}
                                            <button type="button" className="font-medium text-teal-700 hover:underline" onClick={() => setAdding(true)}>
                                                Add &quot;{q.trim()}&quot;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-3 max-h-[45vh] overflow-y-auto">{children}</div>
                </div>
            </div>

            <div className="mt-4 flex justify-end border-t pt-3">
                <Button type="button" onClick={onClose}>
                    <Check size={16} className="mr-1.5" />
                    Done
                </Button>
            </div>
        </Modal>
    );
}

// a brand not in the medex list, saved to the medicine master (id 900000001+)
function NewMedicineForm({ initialName, onCancel, onCreated }: { initialName: string; onCancel: () => void; onCreated: (m: any) => void }) {
    const [f, setF] = useState({ name: initialName.trim(), strength: "", dosageForm: "", genericName: "" });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!f.name.trim()) return toast.error("Brand name is required.");
        setSaving(true);
        const r = await fetch("/api/medicines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
        });
        const d = await r.json().catch(() => null);
        setSaving(false);
        if (!r.ok) return toast.error(d?.error || "Could not add the medicine.");
        toast.success("Medicine added to the list");
        onCreated(d);
    };

    return (
        <div
            className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3"
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                }
            }}
        >
            <input className="input col-span-2" placeholder="Brand name *" value={f.name} autoFocus onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="input" placeholder="Strength (e.g. 500 mg)" value={f.strength} onChange={(e) => setF({ ...f, strength: e.target.value })} />
            <input
                className="input"
                placeholder="Form (Tablet, Capsule...)"
                list="rx-dosage-forms"
                value={f.dosageForm}
                onChange={(e) => setF({ ...f, dosageForm: e.target.value })}
            />
            <datalist id="rx-dosage-forms">
                {["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Suppository", "Mouthwash", "Gel", "Oral Gel", "Ointment", "Cream", "Drops", "Toothpaste"].map((x) => (
                    <option key={x} value={x} />
                ))}
            </datalist>
            <input className="input col-span-2" placeholder="Generic name" value={f.genericName} onChange={(e) => setF({ ...f, genericName: e.target.value })} />
            <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    <X size={16} className="mr-1.5" />
                    Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={save}>
                    <Plus size={16} className="mr-1.5" />
                    Add &amp; Use
                </Button>
            </div>
        </div>
    );
}
