"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, Pagination } from "@/components/ui";
import { Plus, Search, X, Save, Pencil, Trash2, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

const DOSAGE_FORMS = [
    "Tablet", "Capsule", "Suspension", "Syrup", "Gel", "Oral Gel",
    "Oral Paste", "Oral Suspension", "Mouthwash", "Injection",
    "Gargle/Solution", "Solution",
];

const empty = {
    name: "",
    strength: "",
    unit: "",
    dosageForm: "",
    manufacturerType: "Local/Imported",
    treatmentUse: "",
};

export default function Medicines() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [fltForm, setFltForm] = useState("");
    const [fltMfr, setFltMfr] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [f, setF] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const load = (
        query = q,
        form = fltForm,
        mfr = fltMfr,
        pg = page,
        ps = pageSize
    ) => {
        const params = new URLSearchParams({
            page: String(pg),
            pageSize: String(ps),
        });
        if (query.trim()) params.set("q", query.trim());
        if (form) params.set("dosageForm", form);
        if (mfr) params.set("manufacturerType", mfr);
        setLoading(true);
        fetch("/api/medicines?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || []);
                setTotal(d.total || 0);
            })
            .finally(() => setLoading(false));
    };

    const search = (query = q, form = fltForm, mfr = fltMfr) => {
        setPage(1);
        load(query, form, mfr, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load(q, fltForm, fltMfr, pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(q, fltForm, fltMfr, 1, ps);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const openNew = () => {
        setEditing(null);
        setF(empty);
        setModalOpen(true);
    };

    const openEdit = (m: any) => {
        setEditing(m.id);
        setF({
            name: m.name || "",
            strength: m.strength || "",
            unit: m.unit || "",
            dosageForm: m.dosageForm || "",
            manufacturerType: m.manufacturerType || "",
            treatmentUse: m.treatmentUse || "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setF(empty);
    };

    const save = async (e: any) => {
        e.preventDefault();

        const res = await fetch(
            editing ? `/api/medicines/${editing}` : "/api/medicines",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            }
        );

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || "Failed to save medicine.");
            return;
        }

        toast.success(editing ? "Medicine updated" : "Medicine added");
        closeModal();
        load();
    };

    const remove = async (m: any) => {
        if (!confirm(`Delete "${m.name} ${m.strength || ""} ${m.unit || ""}"?`)) return;
        const r = await fetch(`/api/medicines/${m.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Medicine deleted");
        else toast.error("Failed to delete medicine.");
        load();
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Medicines</h1>

                    <p className="text-sm text-slate-500">
                        Medicine master list used in prescriptions.
                    </p>
                </div>

                <Button onClick={openNew}>
                    <Plus size={16} className="mr-1.5" />
                    Add New Medicine
                </Button>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-80">
                        <Label>Search</Label>

                        <Input
                            placeholder="Name, dosage form or treatment..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && search()}
                        />
                    </div>

                    <div className="sm:w-44">
                        <Label>Dosage Form</Label>

                        <select
                            className="input"
                            value={fltForm}
                            onChange={(e) => {
                                setFltForm(e.target.value);
                                search(q, e.target.value);
                            }}
                        >
                            <option value="">All Forms</option>

                            {DOSAGE_FORMS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:w-44">
                        <Label>Manufacturer Type</Label>

                        <select
                            className="input"
                            value={fltMfr}
                            onChange={(e) => {
                                setFltMfr(e.target.value);
                                search(q, fltForm, e.target.value);
                            }}
                        >
                            <option value="">All Types</option>
                            <option>Local/Imported</option>
                            <option>Local</option>
                            <option>Imported</option>
                        </select>
                    </div>

                    <Button onClick={() => search()}>
                        <Search size={16} className="mr-1.5" />
                        Search
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            setFltForm("");
                            setFltMfr("");
                            setPage(1);
                            load("", "", "", 1);
                        }}
                        title="Reset filters and reload"
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Medicine Name</th>
                                <th className="p-3">Strength</th>
                                <th className="p-3">Unit</th>
                                <th className="p-3">Dosage Form</th>
                                <th className="p-3">Manufacturer Type</th>
                                <th className="p-3">Treatment/Use</th>
                                <th className="p-3">Created</th>
                                <th className="p-3">Updated</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((m) => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-3 font-medium">
                                        {m.name}
                                    </td>

                                    <td className="p-3">{m.strength || "-"}</td>
                                    <td className="p-3">{m.unit || "-"}</td>
                                    <td className="p-3">{m.dosageForm || "-"}</td>
                                    <td className="p-3">{m.manufacturerType || "-"}</td>

                                    <td className="p-3 max-w-[220px] truncate" title={m.treatmentUse || ""}>
                                        {m.treatmentUse || "-"}
                                    </td>

                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                                        {fmtDate(m.createdDate)}
                                        {m.createdBy ? ` · ${m.createdBy}` : ""}
                                    </td>

                                    <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                                        {m.updatedBy
                                            ? `${fmtDate(m.updatedDate)} · ${m.updatedBy}`
                                            : "-"}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        <button
                                            className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                            onClick={() => openEdit(m)}
                                            title="Edit medicine"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                            onClick={() => remove(m)}
                                            title="Delete medicine"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {loading && items.length === 0 && <TableLoader colSpan={9} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500">
                                        No medicines found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>
                            Showing{" "}
                            {total === 0 ? 0 : (page - 1) * pageSize + 1}
                            –{Math.min(page * pageSize, total)} of {total}
                        </span>

                        <select
                            className="input !w-auto py-1"
                            value={pageSize}
                            onChange={(e) =>
                                changePageSize(Number(e.target.value))
                            }
                        >
                            {[10, 25, 50].map((n) => (
                                <option key={n} value={n}>
                                    {n} / page
                                </option>
                            ))}
                        </select>
                    </div>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPage={goToPage}
                    />
                </div>
            </Card>

            <Modal
                open={modalOpen}
                title={editing ? "Update Medicine" : "Add New Medicine"}
                onClose={closeModal}
            >
                <form
                    onSubmit={save}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                    <div className="sm:col-span-2">
                        <Label required>Medicine Name</Label>

                        <Input
                            value={f.name}
                            onChange={(e) =>
                                setF({ ...f, name: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div>
                        <Label>Strength</Label>

                        <Input
                            value={f.strength}
                            onChange={(e) =>
                                setF({ ...f, strength: e.target.value })
                            }
                            placeholder="e.g. 500 or 0.12"
                        />
                    </div>

                    <div>
                        <Label>Unit</Label>

                        <Input
                            value={f.unit}
                            onChange={(e) =>
                                setF({ ...f, unit: e.target.value })
                            }
                            placeholder="e.g. mg, mg/5 mL, %"
                        />
                    </div>

                    <div>
                        <Label>Dosage Form</Label>

                        <select
                            className="input"
                            value={f.dosageForm}
                            onChange={(e) =>
                                setF({ ...f, dosageForm: e.target.value })
                            }
                        >
                            <option value="">Select</option>

                            {DOSAGE_FORMS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Manufacturer Type</Label>

                        <select
                            className="input"
                            value={f.manufacturerType}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    manufacturerType: e.target.value,
                                })
                            }
                        >
                            <option value="">Select</option>
                            <option>Local/Imported</option>
                            <option>Local</option>
                            <option>Imported</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Treatment/Use</Label>

                        <Input
                            value={f.treatmentUse}
                            onChange={(e) =>
                                setF({ ...f, treatmentUse: e.target.value })
                            }
                            placeholder="e.g. Dental pain/fever"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeModal}
                        >
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>

                        <Button type="submit">
                            <Save size={16} className="mr-1.5" />
                            {editing ? "Update" : "Save Medicine"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
