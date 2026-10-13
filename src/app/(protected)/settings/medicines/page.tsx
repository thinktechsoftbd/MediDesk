"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, Pagination } from "@/components/ui";
import { Plus, Search, X, Save, Pencil, Trash2, RotateCw, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

const empty = {
    name: "",
    genericName: "",
    strength: "",
    dosageForm: "",
    company: "",
    segment: "",
    priceAmount: "",
    url: "",
    dosage: "",
    duration: "",
    instructions: "",
};

export default function Medicines() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [fltForm, setFltForm] = useState("");
    const [fltMfr, setFltMfr] = useState(""); // segment
    const [facets, setFacets] = useState<{ dosageForms: string[]; segments: string[] }>({ dosageForms: [], segments: [] });
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
        if (mfr) params.set("segment", mfr);
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
        fetch("/api/medicines?facets=1")
            .then((r) => r.json())
            .then((d) => d?.dosageForms && setFacets(d))
            .catch(() => {});
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
            genericName: m.genericName || "",
            strength: m.strength || "",
            dosageForm: m.dosageForm || "",
            company: m.company || "",
            segment: m.segment || "",
            priceAmount: m.priceAmount != null ? String(m.priceAmount) : "",
            url: m.url || "",
            dosage: m.dosage || "",
            duration: m.duration || "",
            instructions: m.instructions || "",
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
        if (!confirm(`Delete "${m.name} ${m.strength || ""}"?`)) return;
        const r = await fetch(`/api/medicines/${m.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Medicine deleted");
        else toast.error((await r.json().catch(() => null))?.error || "Failed to delete medicine.", { duration: 6000 });
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
                            placeholder="Brand, generic or company..."
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

                            {facets.dosageForms.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:w-44">
                        <Label>Segment</Label>

                        <select
                            className="input"
                            value={fltMfr}
                            onChange={(e) => {
                                setFltMfr(e.target.value);
                                search(q, fltForm, e.target.value);
                            }}
                        >
                            <option value="">All Segments</option>
                            {facets.segments.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
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
                                <th className="p-3">Brand Name</th>
                                <th className="p-3">Generic Name</th>
                                <th className="p-3">Strength</th>
                                <th className="p-3">Dosage Form</th>
                                <th className="p-3">Company</th>
                                <th className="p-3">Segment</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3">Default Directions</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((m) => (
                                <tr key={m.id} className="border-b">
                                    <td className="p-3 font-medium">
                                        {m.url ? (
                                            <a href={m.url} target="_blank" rel="noreferrer" className="hover:text-teal-700 hover:underline" title="Open on medex">
                                                {m.name}
                                                <ExternalLink size={12} className="ml-1 inline text-slate-400" />
                                            </a>
                                        ) : (
                                            m.name
                                        )}
                                        <div className="text-xs font-normal text-slate-400">#{m.id}</div>
                                    </td>

                                    <td className="p-3 max-w-[220px] truncate" title={m.genericName || ""}>
                                        {m.genericName || "-"}
                                    </td>
                                    <td className="p-3">{m.strength || "-"}</td>
                                    <td className="p-3">{m.dosageForm || "-"}</td>
                                    <td className="p-3 max-w-[180px] truncate" title={m.company || ""}>{m.company || "-"}</td>
                                    <td className="p-3">{m.segment || "-"}</td>
                                    <td className="p-3 text-right whitespace-nowrap" title={m.priceText || ""}>
                                        {m.priceAmount != null ? `৳ ${Number(m.priceAmount).toFixed(2)}` : "-"}
                                    </td>
                                    <td className="p-3 text-xs text-slate-600">
                                        {[m.dosage, m.duration, m.instructions].filter(Boolean).join(" · ") || "-"}
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
                    <div>
                        <Label required>Brand Name</Label>
                        <Input
                            value={f.name}
                            onChange={(e) => setF({ ...f, name: e.target.value })}
                            placeholder="e.g. Sefril"
                            required
                        />
                    </div>

                    <div>
                        <Label>Generic Name</Label>
                        <Input
                            value={f.genericName}
                            onChange={(e) => setF({ ...f, genericName: e.target.value })}
                            placeholder="e.g. Cephradine"
                        />
                    </div>

                    <div>
                        <Label>Strength</Label>
                        <Input
                            value={f.strength}
                            onChange={(e) => setF({ ...f, strength: e.target.value })}
                            placeholder="e.g. 500 mg, 125 mg/5 ml"
                        />
                    </div>

                    <div>
                        <Label>Dosage Form</Label>
                        <Input
                            list="dosage-forms"
                            value={f.dosageForm}
                            onChange={(e) => setF({ ...f, dosageForm: e.target.value })}
                            placeholder="e.g. Capsule"
                        />
                        <datalist id="dosage-forms">
                            {facets.dosageForms.map((d) => (
                                <option key={d} value={d} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <Label>Company</Label>
                        <Input
                            value={f.company}
                            onChange={(e) => setF({ ...f, company: e.target.value })}
                            placeholder="e.g. ACME Laboratories Ltd."
                        />
                    </div>

                    <div>
                        <Label>Segment</Label>
                        <Input
                            list="segments"
                            value={f.segment}
                            onChange={(e) => setF({ ...f, segment: e.target.value })}
                            placeholder="e.g. Antimicrobial"
                        />
                        <datalist id="segments">
                            {facets.segments.map((d) => (
                                <option key={d} value={d} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <Label>Price (৳)</Label>
                        <Input
                            value={f.priceAmount}
                            onChange={(e) => setF({ ...f, priceAmount: e.target.value })}
                            placeholder="e.g. 15.00"
                            type="number"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="sm:col-span-2 border-t pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Default directions (filled in when picked on a case)
                    </div>

                    <div>
                        <Label>Dosage</Label>
                        <Input
                            value={f.dosage}
                            onChange={(e) => setF({ ...f, dosage: e.target.value.replace(/ +/g, "+") })}
                            placeholder="e.g. 1+0+1"
                        />
                    </div>

                    <div>
                        <Label>Duration</Label>
                        <Input value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} placeholder="e.g. 7 days" />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Instructions</Label>
                        <Input value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="e.g. after meal" />
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Medex URL</Label>
                        <Input
                            value={f.url}
                            onChange={(e) => setF({ ...f, url: e.target.value })}
                            placeholder="https://medex.com.bd/brands/..."
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
