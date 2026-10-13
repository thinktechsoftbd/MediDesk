"use client";

import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Badge, Modal, Textarea } from "@/components/ui";
import { Plus, Pencil, Trash2, Save, Search, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

const empty = { code: "", name: "", description: "" };

export default function PermissionsPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [group, setGroup] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [f, setF] = useState<any>(empty);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const d = await fetch("/api/security/permissions").then((x) => x.json());
            setRows(Array.isArray(d) ? d : []);
        } catch {
            toast.error("Failed to load permissions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const groupOf = (code: string) => String(code).split(".")[0] || "OTHER";
    const groups = Array.from(new Set(rows.map((r) => groupOf(r.code)))).sort();

    const openNew = () => {
        setEditing(null);
        setF(empty);
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setF({ code: p.code || "", name: p.name || "", description: p.description || "" });
        setModalOpen(true);
    };

    const save = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        const res = await fetch(
            editing ? `/api/security/permissions/${editing.id}` : "/api/security/permissions",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            }
        );

        setSaving(false);

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || `Failed to ${editing ? "update" : "create"} permission.`);
            return;
        }

        toast.success(editing ? "Permission updated" : "Permission created");
        setModalOpen(false);
        load();
    };

    const remove = async (p: any) => {
        if (!confirm(`Delete permission ${p.code}?`)) return;
        const res = await fetch(`/api/security/permissions/${p.id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Permission deleted");
            load();
        } else {
            toast.error(
                (await res.json().catch(() => null))?.error || "Failed to delete permission.",
                { duration: 6000 }
            );
        }
    };

    const s = q.trim().toLowerCase();
    const shown = rows.filter(
        (r) =>
            (!group || groupOf(r.code) === group) &&
            (!s ||
                r.code?.toLowerCase().includes(s) ||
                r.name?.toLowerCase().includes(s) ||
                r.description?.toLowerCase().includes(s))
    );

    return (
        <div>
            <h1 className="mb-6 text-2xl font-bold">Permissions</h1>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold">Permission List</h2>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            className="input sm:w-44"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                        >
                            <option value="">All groups</option>
                            {groups.map((g) => (
                                <option key={g} value={g}>
                                    {g.charAt(0) + g.slice(1).toLowerCase()}
                                </option>
                            ))}
                        </select>

                        <div className="relative w-full sm:w-60">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                className="input !pl-9"
                                placeholder="Search code or name..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <Button onClick={openNew} className="shrink-0 whitespace-nowrap">
                            <Plus size={16} className="mr-1.5" />
                            New Permission
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Code</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Used By Roles</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {shown.map((p) => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                                            <KeyRound size={14} className="text-teal-600" />
                                            {p.code}
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3 text-slate-600">{p.description || "-"}</td>
                                    <td className="p-3">
                                        <Badge>{p._count?.roles ?? 0}</Badge>
                                    </td>
                                    <td className="whitespace-nowrap p-3 text-right">
                                        <button
                                            className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                            onClick={() => openEdit(p)}
                                            title="Edit permission"
                                            aria-label="Edit permission"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                            onClick={() => remove(p)}
                                            title="Delete permission"
                                            aria-label="Delete permission"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && shown.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-500">
                                        No permissions found
                                    </td>
                                </tr>
                            )}

                            {loading && <TableLoader colSpan={5} />}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                open={modalOpen}
                title={editing ? "Edit Permission" : "New Permission"}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
                    <div>
                        <Label required>Code</Label>
                        <Input
                            value={f.code}
                            placeholder="e.g. PATIENT.D"
                            onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
                            required
                        />
                    </div>

                    <div>
                        <Label required>Name</Label>
                        <Input
                            value={f.name}
                            placeholder="e.g. Delete Patients"
                            onChange={(e) => setF({ ...f, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                            value={f.description}
                            onChange={(e) => setF({ ...f, description: e.target.value })}
                        />
                    </div>

                    <div className="mt-2 flex gap-2 md:col-span-2">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={saving}
                            className={editing ? "!bg-amber-500 hover:!bg-amber-600" : ""}
                        >
                            {editing ? <Save size={16} className="mr-1.5" /> : <Plus size={16} className="mr-1.5" />}
                            {saving ? "Saving..." : editing ? "Update" : "Save"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
