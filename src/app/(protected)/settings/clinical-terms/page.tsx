"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal } from "@/components/ui";
import { Plus, X, Save, Pencil, Trash2, RotateCw, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { FindingCategory, TERM_CATEGORIES } from "@/lib/clinical-findings";

const empty = { name: "", sortOrder: "" };

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

// Chip lists of the prescription page pickers, one tab per section.
// On Examination uses the O/E master, edited on its own page.
export default function ClinicalTerms() {
    const [cat, setCat] = useState<FindingCategory>("COMPLAINT");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [f, setF] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const title = TERM_CATEGORIES.find((c) => c.key === cat)?.title || "";

    // ?cat=ADVICE opens that tab
    useEffect(() => {
        const c = new URLSearchParams(window.location.search).get("cat");
        if (c && TERM_CATEGORIES.some((x) => x.key === c)) setCat(c as FindingCategory);
    }, []);

    // only the latest request fills the table (tabs can be switched before a list arrives)
    const lastLoad = useRef(0);
    const load = (category = cat) => {
        const n = ++lastLoad.current;
        setLoading(true);
        fetch(`/api/clinical-terms?category=${category}`)
            .then((r) => r.json())
            .then((d) => n === lastLoad.current && setItems(Array.isArray(d) ? d : []))
            .catch(() => toast.error("Failed to load the list."))
            .finally(() => n === lastLoad.current && setLoading(false));
    };

    useEffect(() => {
        setItems([]);
        load(cat);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cat]);

    const shown = useMemo(() => {
        const t = q.trim().toLowerCase();
        return t ? items.filter((x) => x.name.toLowerCase().includes(t)) : items;
    }, [items, q]);

    const openNew = () => {
        setEditing(null);
        setF(empty);
        setModalOpen(true);
    };

    const openEdit = (x: any) => {
        setEditing(x.id);
        setF({ name: x.name, sortOrder: String(x.sortOrder) });
        setModalOpen(true);
    };

    const save = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const body: any = { name: f.name };
        if (String(f.sortOrder).trim() !== "") body.sortOrder = Number(f.sortOrder);
        const r = await fetch(editing ? `/api/clinical-terms/${editing}` : "/api/clinical-terms", {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editing ? body : { ...body, category: cat }),
        });
        setSaving(false);
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Failed to save.");
        if (d?.existed) return toast.error(`"${d.name}" is already in ${title}.`);
        toast.success(editing ? "Updated" : "Added");
        setModalOpen(false);
        load();
    };

    const remove = async (x: any) => {
        if (!confirm(`Delete "${x.name}" from ${title}?\nCases already saved with it keep their text.`)) return;
        const r = await fetch(`/api/clinical-terms/${x.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("Deleted");
            load();
        } else toast.error((await r.json().catch(() => null))?.error || "Failed to delete.");
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Clinical Terms</h1>
                    <p className="text-sm text-slate-500">Chips offered by the pickers on the prescription page.</p>
                </div>
                <Button onClick={openNew}>
                    <Plus size={16} className="mr-1.5" />
                    Add to {title}
                </Button>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                {TERM_CATEGORIES.map((c) => (
                    <button
                        key={c.key}
                        type="button"
                        onClick={() => setCat(c.key)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                            cat === c.key ? "border-teal-700 bg-teal-700 text-white" : "bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                    >
                        {c.title}
                    </button>
                ))}
                <Link
                    href="/settings/oral-exam"
                    className="flex items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                    title="On Examination chips are the O/E list"
                >
                    On Examination
                    <ExternalLink size={13} className="ml-1" />
                </Link>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-80">
                        <Label>Search</Label>
                        <Input placeholder={`Search ${title}...`} value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            load();
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Sort</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Updated</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((x) => (
                                <tr key={x.id} className="border-b">
                                    <td className="p-3 text-slate-500">{x.sortOrder}</td>
                                    <td className="p-3 font-medium">{x.name}</td>
                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(x.createdAt)}</td>
                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(x.updatedAt)}</td>
                                    <td className="p-3 whitespace-nowrap">
                                        <button className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50" onClick={() => openEdit(x)} title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(x)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {loading && items.length === 0 && <TableLoader colSpan={5} />}
                            {!loading && shown.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        {items.length ? "No match" : `No ${title} terms yet`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={modalOpen} title={editing ? `Update ${title}` : `Add to ${title}`} onClose={() => setModalOpen(false)}>
                <form onSubmit={save} className="grid gap-3">
                    <div>
                        <Label required>Name</Label>
                        <Input
                            value={f.name}
                            maxLength={200}
                            onChange={(e) => setF({ ...f, name: e.target.value })}
                            placeholder={cat === "ADVICE" ? "e.g. পানি বেশি করে খাবেন" : "e.g. Toothache"}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="sm:w-40">
                        <Label>Sort Order</Label>
                        <Input
                            type="number"
                            step={1}
                            value={f.sortOrder}
                            onChange={(e) => setF({ ...f, sortOrder: e.target.value })}
                            placeholder={editing ? "" : "Last"}
                        />
                    </div>
                    <p className="text-xs text-slate-500">Chips are shown by sort order, smallest first.</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            <Save size={16} className="mr-1.5" />
                            {editing ? "Update" : "Save"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
