"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Textarea, Modal, Pagination } from "@/components/ui";
import { Plus, X, Save, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const empty = {
    nameEn: "",
    nameBn: "",
    slogan: "",
    code: "",
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    logoUrl: "",
    isActive: true,
};

const fields: { key: string; label: string; full?: boolean }[] = [
    { key: "nameEn", label: "Organization Name (EN)" },
    { key: "nameBn", label: "Organization Name (BN)" },
    { key: "slogan", label: "Slogan", full: true },
    { key: "code", label: "Organization Code" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "website", label: "Website" },
    { key: "addressLine1", label: "Address Line 1" },
    { key: "addressLine2", label: "Address Line 2" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "postalCode", label: "Postal Code" },
    { key: "country", label: "Country" },
    { key: "logoUrl", label: "Logo URL", full: true },
];

export default function Organization() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [form, setForm] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const load = (pg = page, ps = pageSize) => {
        setLoading(true);
        return fetch(`/api/organization?page=${pg}&pageSize=${ps}`)
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || []);
                setTotal(d.total || 0);
            })
            .finally(() => setLoading(false));
    }

    const goToPage = (pg: number) => {
        setPage(pg);
        load(pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(1, ps);
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setEditing(null);
        setForm(empty);
        setModalOpen(true);
    };

    const openEdit = (o: any) => {
        setEditing(o.id);
        const f: any = { ...empty };
        for (const k of Object.keys(empty)) f[k] = o[k] ?? (k === "isActive" ? true : "");
        setForm(f);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setForm(empty);
    };

    const save = async (e: any) => {
        e.preventDefault();

        const res = await fetch(
            editing ? `/api/organization/${editing}` : "/api/organization",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            }
        );

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || "Failed to save organization.");
            return;
        }

        toast.success(editing ? "Organization updated" : "Organization saved");
        closeModal();
        load();
    };

    const remove = async (o: any) => {
        if (!confirm(`Delete organization "${o.nameEn}"?`)) return;
        const r = await fetch(`/api/organization/${o.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Organization deleted");
        else toast.error("Failed to delete organization.");
        load();
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Organization
                    </h1>

                    <p className="text-sm text-slate-500">
                        Manage organization profile and branding.
                    </p>
                </div>

                <Button onClick={openNew}>
                    <Plus size={16} className="mr-1.5" />
                    New Organization
                </Button>
            </div>

            <Card className="p-5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Code</th>
                                <th className="p-3">Name (EN)</th>
                                <th className="p-3">Name (BN)</th>
                                <th className="p-3">Slogan</th>
                                <th className="p-3">Phone</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">City</th>
                                <th className="p-3">Active</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((o) => (
                                <tr key={o.id} className="border-b">
                                    <td className="p-3">{o.code || "-"}</td>

                                    <td className="p-3 font-medium">
                                        {o.nameEn}
                                    </td>

                                    <td className="p-3">{o.nameBn || "-"}</td>
                                    <td className="p-3">{o.slogan || "N/A"}</td>
                                    <td className="p-3">{o.phone || "-"}</td>
                                    <td className="p-3">{o.email || "-"}</td>
                                    <td className="p-3">{o.city || "-"}</td>

                                    <td className="p-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                o.isActive
                                                    ? "bg-teal-50 text-teal-700"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {o.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    <td className="p-3">
                                        <button
                                            className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                            onClick={() => openEdit(o)}
                                            title="Edit organization"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                            onClick={() => remove(o)}
                                            title="Delete organization"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {loading && items.length === 0 && <TableLoader colSpan={9} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-8 text-center text-slate-500"
                                    >
                                        No organizations yet
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
                title={editing ? "Update Organization" : "New Organization"}
                onClose={closeModal}
            >
                <form
                    onSubmit={save}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                    {fields.map((f) => (
                        <div
                            key={f.key}
                            className={f.full ? "sm:col-span-2" : ""}
                        >
                            <Label required={f.key === "nameEn"}>
                                {f.label}
                            </Label>

                            {f.key === "slogan" ? (
                                <Textarea
                                    value={form[f.key]}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                />
                            ) : (
                                <Input
                                    value={form[f.key]}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                    required={f.key === "nameEn"}
                                />
                            )}
                        </div>
                    ))}

                    <div className="flex items-center gap-2 sm:col-span-2">
                        <input
                            id="orgActive"
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    isActive: e.target.checked,
                                })
                            }
                        />

                        <label htmlFor="orgActive" className="text-sm">
                            Active
                        </label>
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
                            {editing ? "Update" : "Save"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
