"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import type { FindingItem } from "@/lib/clinical-findings";

// Picker of one clinical section (Patient Complaints, Advice...): search, a cloud of chips
// from the section's master list (click to add), and the picked items below with a note
// each (e.g. tooth "21"). Changes go to the page as they are made; Done only closes.
export default function FindingPickerModal({
    open,
    title,
    terms,
    items,
    onAdd,
    onChange,
    onCreate,
    onClose,
}: {
    open: boolean;
    title: string;
    terms: any[]; // [{ id, name, remarks? }]
    items: FindingItem[];
    onAdd: (term: any) => void;
    onChange: (items: FindingItem[]) => void;
    onCreate: (name: string) => Promise<any | null>; // saves a new term to the master list
    onClose: () => void;
}) {
    const [q, setQ] = useState("");
    const [creating, setCreating] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const noteRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!open) return;
        setQ("");
        setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    const picked = useMemo(() => new Set(items.map((i) => i.term.toLowerCase())), [items]);
    const t = q.trim().toLowerCase();
    const shown = useMemo(() => (t ? terms.filter((x) => x.name.toLowerCase().includes(t)) : terms), [terms, t]);
    const exact = t ? terms.find((x) => x.name.toLowerCase() === t) : null;

    // a chip already picked jumps to its note instead of adding it twice
    const add = (term: any) => {
        const at = items.findIndex((i) => i.term.toLowerCase() === term.name.toLowerCase());
        setQ("");
        if (at >= 0) noteRefs.current[at]?.focus();
        else {
            onAdd(term);
            searchRef.current?.focus();
        }
    };

    const create = async () => {
        const name = q.trim().replace(/\s+/g, " ");
        if (!name || creating) return;
        setCreating(true);
        const term = await onCreate(name);
        setCreating(false);
        if (term) add(term);
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (exact) add(exact);
            else if (shown.length === 1) add(shown[0]);
            else if (t && !shown.length) create();
        } else if (e.key === "Escape" && q) {
            e.stopPropagation();
            setQ("");
        }
    };

    const setNote = (i: number, note: string) => onChange(items.map((it, j) => (j === i ? { ...it, note } : it)));

    return (
        <Modal open={open} wide title={title} onClose={onClose}>
            <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                    ref={searchRef}
                    autoFocus
                    className="input !pl-9"
                    placeholder={`Search ${title}... (Enter to add)`}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={onKey}
                />
            </div>

            <div className="max-h-[34vh] overflow-y-auto rounded-xl border bg-slate-50/60 p-2.5">
                <div className="flex flex-wrap gap-1.5">
                    {shown.map((x) => {
                        const on = picked.has(x.name.toLowerCase());
                        return (
                            <button
                                key={x.id}
                                type="button"
                                onClick={() => add(x)}
                                title={on ? "Already added: edit its note below" : x.remarks ? `Adds to Advice: ${x.remarks}` : "Add"}
                                className={`flex items-center rounded-full border px-2.5 py-1 text-sm ${
                                    on
                                        ? "border-teal-600 bg-teal-600 text-white"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50"
                                }`}
                            >
                                {on ? <Check size={13} className="mr-1" /> : <Plus size={13} className="mr-1 text-teal-600" />}
                                {x.name}
                            </button>
                        );
                    })}
                    {t && !exact && (
                        <button
                            type="button"
                            disabled={creating}
                            onClick={create}
                            className="flex items-center rounded-full border border-dashed border-teal-500 bg-white px-2.5 py-1 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                            title={`Save "${q.trim()}" to the ${title} list and add it`}
                        >
                            {creating ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Plus size={13} className="mr-1" />}
                            Add &ldquo;{q.trim()}&rdquo;
                        </button>
                    )}
                    {!shown.length && !t && <p className="p-1 text-sm text-slate-500">No terms yet. Type one above to add it.</p>}
                </div>
            </div>

            <div className="mb-1.5 mt-4 text-sm font-medium text-slate-700">Selected ({items.length})</div>
            <div className="divide-y rounded-xl border">
                {items.map((it, i) => (
                    <div key={`${it.term}-${i}`} className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap">
                        <span className="w-5 shrink-0 text-xs text-slate-400">{i + 1}.</span>
                        <span className="min-w-0 flex-1 text-sm font-medium">{it.term}</span>
                        <input
                            ref={(el) => {
                                noteRefs.current[i] = el;
                            }}
                            className="input !py-1.5 sm:!w-56"
                            placeholder="Note (e.g. 21)"
                            maxLength={200}
                            value={it.note}
                            onChange={(e) => setNote(i, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && searchRef.current?.focus()}
                        />
                        <button
                            type="button"
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            title="Remove"
                            onClick={() => onChange(items.filter((_, j) => j !== i))}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                ))}
                {!items.length && <p className="px-3 py-4 text-center text-sm text-slate-500">Nothing picked yet. Click a chip above.</p>}
            </div>

            <div className="mt-4 flex justify-end">
                <Button onClick={onClose}>
                    <Check size={16} className="mr-1.5" />
                    Done
                </Button>
            </div>
        </Modal>
    );
}
