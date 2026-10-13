"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, Textarea } from "@/components/ui";
import { Plus, Search, X, Save, Pencil, Trash2, RotateCw } from "lucide-react";
import toast from "react-hot-toast";

const empty = { diseaseName: "", remarks: "" };

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

export default function OralExamDiseases() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [f, setF] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = (query = q) => {
        setLoading(true);
        fetch("/api/oral-exam-diseases" + (query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""))
            .then((r) => r.json())
            .then((d) => setItems(Array.isArray(d) ? d : []))
            .catch(() => toast.error("Failed to load O/E list."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openNew = () => {
        setEditing(null);
        setF(empty);
        setModalOpen(true);
    };

    const openEdit = (x: any) => {
        setEditing(x.id);
        setF({ diseaseName: x.diseaseName || "", remarks: x.remarks || "" });
        setModalOpen(true);
    };

    const save = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const r = await fetch(editing ? `/api/oral-exam-diseases/${editing}` : "/api/oral-exam-diseases", {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
        });
        setSaving(false);
        if (!r.ok) return toast.error((await r.json().catch(() => null))?.error || "Failed to save.");
        toast.success(editing ? "O/E updated" : "O/E added");
        setModalOpen(false);
        load();
    };

    const remove = async (x: any) => {
        if (!confirm(`Delete "${x.diseaseName}"?`)) return;
        const r = await fetch(`/api/oral-exam-diseases/${x.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("O/E deleted");
            load();
        } else toast.error((await r.json().catch(() => null))?.error || "Failed to delete.", { duration: 6000 });
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Oral Examination (O/E)</h1>
                    <p className="text-sm text-slate-500">O/E findings with default remarks, used in case history.</p>
                </div>
                <Button onClick={openNew}>
                    <Plus size={16} className="mr-1.5" />
                    Add New O/E
                </Button>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-80">
                        <Label>Search</Label>
                        <Input
                            placeholder="Disease name or remarks..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && load()}
                        />
                    </div>
                    <Button onClick={() => load()}>
                        <Search size={16} className="mr-1.5" />
                        Search
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            load("");
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
                                <th className="p-3">Disease Name</th>
                                <th className="p-3">Default Remarks</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Updated</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((x) => (
                                <tr key={x.id} className="border-b">
                                    <td className="p-3 text-slate-500">{x.id}</td>
                                    <td className="p-3 font-medium">{x.diseaseName}</td>
                                    <td className="p-3 max-w-[360px] text-slate-600">{x.remarks || "-"}</td>
                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(x.createdDate)}</td>
                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">{fmtDate(x.lastUpdatedDate)}</td>
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
                            {loading && items.length === 0 && <TableLoader colSpan={6} />}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No O/E findings yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={modalOpen} title={editing ? "Update O/E" : "Add New O/E"} onClose={() => setModalOpen(false)}>
                <form onSubmit={save} className="grid gap-3">
                    <div>
                        <Label required>Disease Name</Label>
                        <Input
                            value={f.diseaseName}
                            maxLength={150}
                            onChange={(e) => setF({ ...f, diseaseName: e.target.value })}
                            placeholder="e.g. Pulpitis"
                            required
                        />
                    </div>
                    <div>
                        <Label>Default Remarks</Label>
                        <Textarea
                            value={f.remarks}
                            maxLength={250}
                            onChange={(e) => setF({ ...f, remarks: e.target.value })}
                            placeholder="Filled into the case Remarks when this O/E is picked"
                        />
                        <p className="mt-1 text-right text-xs text-slate-400">{f.remarks.length}/250</p>
                    </div>
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
