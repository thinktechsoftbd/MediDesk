"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Card, Pagination } from "@/components/ui";

export type PickedPatient = { id: number; patientNo: string; name: string; phone: string; email?: string | null };

const PAGE_SIZE = 10;
const pick = (p: any): PickedPatient => ({ id: p.id, patientNo: p.patientNo, name: p.name, phone: p.phone, email: p.email });

// Two lists for choosing many patients: on the left every patient, searched and paged on the server; on the right
// the ones selected, searched and paged here. Ticks are kept across pages; the arrows (or a double-click) move
// the ticked patients from one list to the other.
export default function PatientPicker({ selected, onChange }: { selected: PickedPatient[]; onChange: (p: PickedPatient[]) => void }) {
    // left: patients to be selected
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [leftTicked, setLeftTicked] = useState<Map<number, PickedPatient>>(new Map());

    // right: selected patients
    const [rq, setRq] = useState("");
    const [rpage, setRpage] = useState(1);
    const [rightTicked, setRightTicked] = useState<Set<number>>(new Set());

    const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

    // a new search starts on page 1
    useEffect(() => setPage(1), [q]);
    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => {
            fetch(`/api/patients?q=${encodeURIComponent(q.trim())}&page=${page}&pageSize=${PAGE_SIZE}`)
                .then((r) => r.json())
                .then((d) => {
                    setItems(d.items || []);
                    setTotal(d.total || 0);
                })
                .catch(() => setItems([]))
                .finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(t);
    }, [q, page]);

    const rightFiltered = useMemo(() => {
        const s = rq.trim().toLowerCase();
        return s
            ? selected.filter((p) => [p.name, p.phone, p.patientNo].some((v) => (v || "").toLowerCase().includes(s)))
            : selected;
    }, [selected, rq]);
    const rightPages = Math.max(1, Math.ceil(rightFiltered.length / PAGE_SIZE));
    const rightRows = rightFiltered.slice((rpage - 1) * PAGE_SIZE, rpage * PAGE_SIZE);
    useEffect(() => setRpage(1), [rq]);
    useEffect(() => {
        if (rpage > rightPages) setRpage(rightPages);
    }, [rpage, rightPages]);

    // left Check All: the patients on this page not selected yet
    const leftSelectable = items.filter((p) => !selectedIds.has(p.id));
    const leftAllTicked = leftSelectable.length > 0 && leftSelectable.every((p) => leftTicked.has(p.id));
    const toggleLeftAll = () =>
        setLeftTicked((m) => {
            const next = new Map(m);
            for (const p of leftSelectable) leftAllTicked ? next.delete(p.id) : next.set(p.id, pick(p));
            return next;
        });
    const toggleLeft = (p: any) =>
        setLeftTicked((m) => {
            const next = new Map(m);
            next.has(p.id) ? next.delete(p.id) : next.set(p.id, pick(p));
            return next;
        });

    // right Check All: every selected patient the search shows, on all its pages
    const rightAllTicked = rightFiltered.length > 0 && rightFiltered.every((p) => rightTicked.has(p.id));
    const toggleRightAll = () =>
        setRightTicked((s) => {
            const next = new Set(s);
            for (const p of rightFiltered) rightAllTicked ? next.delete(p.id) : next.add(p.id);
            return next;
        });
    const toggleRight = (id: number) =>
        setRightTicked((s) => {
            const next = new Set(s);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const add = (extra: PickedPatient[]) => {
        const fresh = extra.filter((p) => !selectedIds.has(p.id));
        if (fresh.length) onChange([...selected, ...fresh]);
        setLeftTicked((m) => {
            const next = new Map(m);
            for (const p of extra) next.delete(p.id);
            return next;
        });
    };
    const remove = (ids: Set<number>) => {
        onChange(selected.filter((p) => !ids.has(p.id)));
        setRightTicked((s) => new Set(Array.from(s).filter((id) => !ids.has(id))));
    };

    const cell = "px-3 py-2";
    const searchBox = (value: string, set: (v: string) => void, placeholder: string) => (
        <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input !pl-9" placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} />
        </div>
    );

    return (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Card className="p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold">Patient(s) to be selected</h2>
                    <span className="text-xs text-slate-500">{total.toLocaleString("en-US")} found</span>
                </div>
                {searchBox(q, setQ, "Search patients by name, phone or patient no...")}
                <table className="mt-3 w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-slate-500">
                            <th className={`${cell} w-8`}>
                                <input type="checkbox" checked={leftAllTicked} onChange={toggleLeftAll} disabled={!leftSelectable.length} title="Check all on this page" />
                            </th>
                            <th className={cell}>Patient No</th>
                            <th className={cell}>Name</th>
                            <th className={cell}>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((p) => {
                            const isSelected = selectedIds.has(p.id);
                            return (
                                <tr
                                    key={p.id}
                                    className={`border-b ${isSelected ? "text-slate-400" : "cursor-pointer hover:bg-slate-50"}`}
                                    onClick={() => !isSelected && toggleLeft(p)}
                                    onDoubleClick={() => !isSelected && add([pick(p)])}
                                    title={isSelected ? "Already selected" : "Double-click to select"}
                                >
                                    <td className={cell}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected || leftTicked.has(p.id)}
                                            disabled={isSelected}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => toggleLeft(p)}
                                        />
                                    </td>
                                    <td className={`${cell} whitespace-nowrap`}>{p.patientNo}</td>
                                    <td className={cell}>{p.name}</td>
                                    <td className={`${cell} whitespace-nowrap`}>{p.phone || "—"}</td>
                                </tr>
                            );
                        })}
                        {loading && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-500">
                                    <Loader2 size={16} className="mr-1.5 inline animate-spin" /> Loading...
                                </td>
                            </tr>
                        )}
                        {!loading && items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-500">
                                    No patient found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{leftTicked.size} ticked</span>
                    <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onPage={setPage} />
                </div>
            </Card>

            <div className="flex items-center justify-center gap-2 lg:flex-col">
                <button
                    type="button"
                    className="btn-primary !px-3"
                    disabled={!leftTicked.size}
                    onClick={() => add(Array.from(leftTicked.values()))}
                    title="Move the ticked patients to Selected Patients"
                >
                    Add <ChevronRight size={16} className="ml-1" />
                </button>
                <button
                    type="button"
                    className="btn-secondary !px-3"
                    disabled={!rightTicked.size}
                    onClick={() => remove(rightTicked)}
                    title="Move the ticked patients back"
                >
                    <ChevronLeft size={16} className="mr-1" /> Remove
                </button>
            </div>

            <Card className="p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold">Selected Patients</h2>
                    <span className="text-xs text-slate-500">{selected.length.toLocaleString("en-US")} selected</span>
                </div>
                {searchBox(rq, setRq, "Search selected patients...")}
                <table className="mt-3 w-full text-left text-sm">
                    <thead>
                        <tr className="border-b text-slate-500">
                            <th className={`${cell} w-8`}>
                                <input type="checkbox" checked={rightAllTicked} onChange={toggleRightAll} disabled={!rightFiltered.length} title="Check all" />
                            </th>
                            <th className={cell}>Patient No</th>
                            <th className={cell}>Name</th>
                            <th className={cell}>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rightRows.map((p) => (
                            <tr
                                key={p.id}
                                className="cursor-pointer border-b hover:bg-slate-50"
                                onClick={() => toggleRight(p.id)}
                                onDoubleClick={() => remove(new Set([p.id]))}
                                title="Double-click to remove"
                            >
                                <td className={cell}>
                                    <input
                                        type="checkbox"
                                        checked={rightTicked.has(p.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => toggleRight(p.id)}
                                    />
                                </td>
                                <td className={`${cell} whitespace-nowrap`}>{p.patientNo}</td>
                                <td className={cell}>{p.name}</td>
                                <td className={`${cell} whitespace-nowrap`}>{p.phone || "—"}</td>
                            </tr>
                        ))}
                        {rightRows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-slate-500">
                                    {selected.length ? "No selected patient matches" : "Tick patients on the left and press Add"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{rightTicked.size} ticked</span>
                    <Pagination page={rpage} totalPages={rightPages} onPage={setRpage} />
                </div>
            </Card>
        </div>
    );
}
