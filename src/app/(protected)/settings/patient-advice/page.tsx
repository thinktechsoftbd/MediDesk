"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, Textarea } from "@/components/ui";
import { Plus, X, Save, Pencil, Trash2, RotateCw, FolderPlus } from "lucide-react";
import { useAutoSearch, useLatestRequest } from "@/components/use-auto-search";
import toast from "react-hot-toast";

const emptyAdvice = { typeId: "", title: "", advice: "", isActive: true };
const emptyType = { name: "", description: "", isActive: true };

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

function Status({ active }: { active: boolean }) {
    return active ? (
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">Active</span>
    ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
    );
}

// Advice types on the left (click one to filter), their advice on the right
export default function PatientAdvicePage() {
    const [types, setTypes] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [typeId, setTypeId] = useState(""); // "" = all types

    const [af, setAf] = useState<any>(emptyAdvice);
    const [adviceEditing, setAdviceEditing] = useState<number | null>(null);
    const [adviceOpen, setAdviceOpen] = useState(false);
    const [tf, setTf] = useState<any>(emptyType);
    const [typeEditing, setTypeEditing] = useState<number | null>(null);
    const [typeOpen, setTypeOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const latest = useLatestRequest();
    const load = (query = q, tid = typeId) => {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (tid) params.set("typeId", tid);
        const current = latest();
        setLoading(true);
        fetch("/api/patient-advice?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                if (!current()) return;
                if (d?.error) toast.error(d.error, { duration: 8000 });
                setTypes(d.types || []);
                setItems(d.items || []);
            })
            .catch(() => current() && toast.error("Failed to load patient advice."))
            .finally(() => current() && setLoading(false));
    };
    // the search box searches as you type
    useAutoSearch(q, () => load());

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickType = (tid: string) => {
        setTypeId(tid);
        load(q, tid);
    };
    const typeName = (tid: string) => types.find((t) => String(t.id) === tid)?.name || "";
    const total = types.reduce((n, t) => n + t.count, 0);

    // ---------- advice ----------
    const openNewAdvice = () => {
        setAdviceEditing(null);
        // the type picked on the left, its name as the title
        setAf({ ...emptyAdvice, typeId, title: typeName(typeId) });
        setAdviceOpen(true);
    };

    const openEditAdvice = (x: any) => {
        setAdviceEditing(x.id);
        setAf({ typeId: String(x.typeId), title: x.title, advice: x.advice, isActive: x.isActive });
        setAdviceOpen(true);
    };

    // a new type fills in the title while it is empty or still the old type's name
    const changeAdviceType = (tid: string) =>
        setAf((f: any) => ({ ...f, typeId: tid, title: !f.title || f.title === typeName(f.typeId) ? typeName(tid) : f.title }));

    const saveAdvice = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const r = await fetch(adviceEditing ? `/api/patient-advice/${adviceEditing}` : "/api/patient-advice", {
            method: adviceEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...af, typeId: Number(af.typeId) }),
        });
        setSaving(false);
        if (!r.ok) return toast.error((await r.json().catch(() => null))?.error || "Failed to save.");
        toast.success(adviceEditing ? "Advice updated" : "Advice added");
        setAdviceOpen(false);
        load();
    };

    const removeAdvice = async (x: any) => {
        if (!confirm(`Delete advice "${x.title}"?`)) return;
        const r = await fetch(`/api/patient-advice/${x.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("Advice deleted");
            load();
        } else toast.error((await r.json().catch(() => null))?.error || "Failed to delete.", { duration: 6000 });
    };

    // ---------- types ----------
    const openNewType = () => {
        setTypeEditing(null);
        setTf(emptyType);
        setTypeOpen(true);
    };

    const openEditType = (t: any) => {
        setTypeEditing(t.id);
        setTf({ name: t.name, description: t.description || "", isActive: t.isActive });
        setTypeOpen(true);
    };

    const saveType = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const r = await fetch(typeEditing ? `/api/patient-advice/types/${typeEditing}` : "/api/patient-advice/types", {
            method: typeEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tf),
        });
        setSaving(false);
        if (!r.ok) return toast.error((await r.json().catch(() => null))?.error || "Failed to save.");
        toast.success(typeEditing ? "Type updated" : "Type added");
        setTypeOpen(false);
        load();
    };

    const removeType = async (t: any) => {
        if (!confirm(`Delete type "${t.name}"?`)) return;
        const r = await fetch(`/api/patient-advice/types/${t.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("Type deleted");
            if (String(t.id) === typeId) pickType("");
            else load();
        } else toast.error((await r.json().catch(() => null))?.error || "Failed to delete.", { duration: 6000 });
    };

    const typeRow = (key: string, label: string, count: number, t?: any) => {
        const active = typeId === key;
        return (
            <li key={key} className="group flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => pickType(key)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active ? "bg-teal-50 font-semibold text-teal-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    <span className={`min-w-0 flex-1 truncate ${t && !t.isActive ? "text-slate-400 line-through" : ""}`}>{label}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{count}</span>
                </button>
                {t && (
                    <>
                        <button className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50" onClick={() => openEditType(t)} title="Edit type">
                            <Pencil size={14} />
                        </button>
                        <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeType(t)} title="Delete type">
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </li>
        );
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">Patient Advice</h1>
                    <p className="text-sm text-slate-500">Advice for patients by treatment type, one advice per line.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={openNewType}>
                        <FolderPlus size={16} className="mr-1.5" />
                        New Type
                    </Button>
                    <Button onClick={openNewAdvice}>
                        <Plus size={16} className="mr-1.5" />
                        Add New Advice
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
                <Card className="self-start p-4">
                    <h2 className="mb-2 px-1 text-sm font-semibold text-slate-700">Advice Types</h2>
                    <ul className="space-y-0.5">
                        {typeRow("", "All types", total)}
                        {types.map((t) => typeRow(String(t.id), t.name, t.count, t))}
                    </ul>
                    {!loading && types.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No types yet</p>}
                </Card>

                <Card className="p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="sm:w-80">
                            <Label>Search</Label>
                            <Input placeholder="Type, title or advice text..." value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setQ("");
                                setTypeId("");
                                load("", "");
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
                                    <th className="p-3">#</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Title</th>
                                    <th className="p-3">Advice</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Updated</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((x) => (
                                    <tr key={x.id} className="border-b align-top">
                                        <td className="p-3 text-slate-500">{x.id}</td>
                                        <td className="p-3 whitespace-nowrap">{x.typeName}</td>
                                        <td className="p-3 font-medium">{x.title}</td>
                                        <td className="min-w-[320px] whitespace-pre-line p-3 leading-relaxed text-slate-700">{x.advice}</td>
                                        <td className="p-3">
                                            <Status active={x.isActive} />
                                        </td>
                                        <td className="p-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(x.updatedAt || x.createdAt)}</td>
                                        <td className="p-3 whitespace-nowrap">
                                            <button className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50" onClick={() => openEditAdvice(x)} title="Edit">
                                                <Pencil size={16} />
                                            </button>
                                            <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => removeAdvice(x)} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {loading && items.length === 0 && <TableLoader colSpan={7} />}
                                {!loading && items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500">
                                            No advice found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal open={adviceOpen} title={adviceEditing ? "Update Advice" : "Add New Advice"} onClose={() => setAdviceOpen(false)}>
                <form onSubmit={saveAdvice} className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label required>Type</Label>
                            <select className="input" value={af.typeId} onChange={(e) => changeAdviceType(e.target.value)} required>
                                <option value="">Select type...</option>
                                {types.map((t) => (
                                    <option key={t.id} value={String(t.id)}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label required>Title</Label>
                            <Input value={af.title} maxLength={200} onChange={(e) => setAf({ ...af, title: e.target.value })} required />
                        </div>
                    </div>
                    <div>
                        <Label required>Advice</Label>
                        <Textarea
                            rows={11}
                            value={af.advice}
                            onChange={(e) => setAf({ ...af, advice: e.target.value })}
                            placeholder="One advice per line"
                            required
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={af.isActive} onChange={(e) => setAf({ ...af, isActive: e.target.checked })} />
                        Active
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setAdviceOpen(false)}>
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            <Save size={16} className="mr-1.5" />
                            {adviceEditing ? "Update" : "Save"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={typeOpen} title={typeEditing ? "Update Advice Type" : "New Advice Type"} onClose={() => setTypeOpen(false)}>
                <form onSubmit={saveType} className="grid gap-3">
                    <div>
                        <Label required>Type Name</Label>
                        <Input
                            value={tf.name}
                            maxLength={150}
                            onChange={(e) => setTf({ ...tf, name: e.target.value })}
                            placeholder="e.g. Tooth Extraction"
                            required
                        />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Textarea value={tf.description} maxLength={500} onChange={(e) => setTf({ ...tf, description: e.target.value })} />
                        <p className="mt-1 text-right text-xs text-slate-400">{tf.description.length}/500</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={tf.isActive} onChange={(e) => setTf({ ...tf, isActive: e.target.checked })} />
                        Active
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setTypeOpen(false)}>
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            <Save size={16} className="mr-1.5" />
                            {typeEditing ? "Update" : "Save"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
