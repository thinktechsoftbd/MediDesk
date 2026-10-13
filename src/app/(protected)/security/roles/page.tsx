"use client";

import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Badge, Modal, Textarea } from "@/components/ui";
import { Plus, Pencil, Trash2, Save, Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

const empty = { name: "", description: "", permissionIds: [] as number[] };

export default function RolesPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [f, setF] = useState<any>(empty);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [r, p] = await Promise.all([
                fetch("/api/security/roles").then((x) => x.json()),
                fetch("/api/security/permissions").then((x) => x.json()),
            ]);
            setRoles(Array.isArray(r) ? r : []);
            setPermissions(Array.isArray(p) ? p : []);
        } catch {
            toast.error("Failed to load roles.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // group permissions by code prefix: PATIENT.V -> PATIENT
    const groups: Record<string, any[]> = {};
    for (const p of permissions) {
        const g = String(p.code).split(".")[0] || "OTHER";
        (groups[g] ||= []).push(p);
    }

    const openNew = () => {
        setEditing(null);
        setF({ ...empty, permissionIds: [] });
        setModalOpen(true);
    };

    const openEdit = (r: any) => {
        setEditing(r);
        setF({
            name: r.name || "",
            description: r.description || "",
            permissionIds: (r.permissions || []).map((x: any) => x.permissionId),
        });
        setModalOpen(true);
    };

    const toggle = (id: number) =>
        setF((s: any) => ({
            ...s,
            permissionIds: s.permissionIds.includes(id)
                ? s.permissionIds.filter((x: number) => x !== id)
                : [...s.permissionIds, id],
        }));

    const toggleGroup = (items: any[], on: boolean) =>
        setF((s: any) => {
            const ids = items.map((p) => p.id);
            const rest = s.permissionIds.filter((x: number) => !ids.includes(x));
            return { ...s, permissionIds: on ? [...rest, ...ids] : rest };
        });

    const allOn = permissions.length > 0 && f.permissionIds.length === permissions.length;

    const save = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        const res = await fetch(
            editing ? `/api/security/roles/${editing.id}` : "/api/security/roles",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            }
        );

        setSaving(false);

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || `Failed to ${editing ? "update" : "create"} role.`);
            return;
        }

        toast.success(editing ? "Role updated" : "Role created");
        setModalOpen(false);
        load();
    };

    const remove = async (r: any) => {
        if (!confirm(`Delete role ${r.name}?`)) return;
        const res = await fetch(`/api/security/roles/${r.id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Role deleted");
            load();
        } else {
            toast.error(
                (await res.json().catch(() => null))?.error || "Failed to delete role.",
                { duration: 6000 }
            );
        }
    };

    const s = q.trim().toLowerCase();
    const shown = s
        ? roles.filter(
              (r) =>
                  r.name?.toLowerCase().includes(s) ||
                  r.description?.toLowerCase().includes(s)
          )
        : roles;

    return (
        <div>
            <h1 className="mb-6 text-2xl font-bold">Roles</h1>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold">Role List</h2>

                    <div className="flex items-center gap-2">
                        <div className="relative w-full sm:w-60">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                className="input !pl-9"
                                placeholder="Search role..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <Button onClick={openNew} className="shrink-0 whitespace-nowrap">
                            <Plus size={16} className="mr-1.5" />
                            New Role
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Role Name</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Permissions</th>
                                <th className="p-3">Users</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {shown.map((r) => (
                                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 font-medium">
                                            <ShieldCheck size={16} className="text-teal-600" />
                                            {r.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600">{r.description || "-"}</td>
                                    <td className="p-3">
                                        <Badge>
                                            {r.permissions?.length ?? 0} / {permissions.length}
                                        </Badge>
                                    </td>
                                    <td className="p-3">{r._count?.users ?? 0}</td>
                                    <td className="whitespace-nowrap p-3 text-right">
                                        <button
                                            className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                            onClick={() => openEdit(r)}
                                            title="Edit role"
                                            aria-label="Edit role"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                            onClick={() => remove(r)}
                                            title="Delete role"
                                            aria-label="Delete role"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && shown.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-500">
                                        No roles found
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
                title={editing ? "Edit Role" : "New Role"}
                onClose={() => setModalOpen(false)}
                wide
            >
                <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
                    <div>
                        <Label required>Role Name</Label>
                        <Input
                            value={f.name}
                            onChange={(e) => setF({ ...f, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Textarea
                            className="input min-h-[42px] resize-y"
                            rows={1}
                            value={f.description}
                            onChange={(e) => setF({ ...f, description: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <div className="mb-2 flex items-center justify-between">
                            <Label>Permissions</Label>
                            <label className="flex items-center gap-1.5 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={allOn}
                                    onChange={(e) => toggleGroup(permissions, e.target.checked)}
                                />
                                Select all
                            </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(groups).map(([g, items]) => {
                                const on = items.every((p) => f.permissionIds.includes(p.id));
                                return (
                                    <div key={g} className="rounded-xl border p-3">
                                        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                                            <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={(e) => toggleGroup(items, e.target.checked)}
                                            />
                                            {g.charAt(0) + g.slice(1).toLowerCase()}
                                        </label>

                                        <div className="space-y-1 pl-5">
                                            {items.map((p) => (
                                                <label key={p.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={f.permissionIds.includes(p.id)}
                                                        onChange={() => toggle(p.id)}
                                                    />
                                                    {p.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {permissions.length === 0 && (
                                <div className="text-sm text-slate-500">No permissions defined.</div>
                            )}
                        </div>
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
