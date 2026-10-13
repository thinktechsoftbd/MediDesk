"use client";

import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Label, Button, Badge, Modal, SearchSelect } from "@/components/ui";
import { Plus, Pencil, Trash2, Save, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function UserRolesPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [f, setF] = useState({ userId: "", roleId: "" });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [a, u, r] = await Promise.all([
                fetch("/api/security/user-roles").then((x) => x.json()),
                fetch("/api/security/users").then((x) => x.json()),
                fetch("/api/security/roles").then((x) => x.json()),
            ]);
            setRows(Array.isArray(a) ? a : []);
            setUsers(Array.isArray(u) ? u : []);
            setRoles(Array.isArray(r) ? r : []);
        } catch {
            toast.error("Failed to load user roles.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setEditing(null);
        setF({ userId: "", roleId: "" });
        setModalOpen(true);
    };

    const openEdit = (row: any) => {
        setEditing(row);
        setF({ userId: String(row.userId), roleId: String(row.roleId) });
        setModalOpen(true);
    };

    const save = async (e: any) => {
        e.preventDefault();
        if (!f.userId || !f.roleId) {
            toast.error("Select a user and a role.");
            return;
        }
        setSaving(true);

        const res = await fetch("/api/security/user-roles", {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                editing
                    ? {
                          userId: editing.userId,
                          roleId: editing.roleId,
                          newUserId: f.userId,
                          newRoleId: f.roleId,
                      }
                    : f
            ),
        });

        setSaving(false);

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || `Failed to ${editing ? "update" : "assign"} role.`);
            return;
        }

        toast.success(editing ? "User role updated" : "Role assigned");
        setModalOpen(false);
        load();
    };

    const remove = async (row: any) => {
        if (!confirm(`Remove role ${row.role.name} from ${row.user.name}?`)) return;
        const res = await fetch(
            `/api/security/user-roles?userId=${row.userId}&roleId=${row.roleId}`,
            { method: "DELETE" }
        );
        if (res.ok) {
            toast.success("User role removed");
            load();
        } else {
            toast.error(
                (await res.json().catch(() => null))?.error || "Failed to remove user role.",
                { duration: 6000 }
            );
        }
    };

    const s = q.trim().toLowerCase();
    const shown = rows.filter(
        (r) =>
            (!roleFilter || String(r.roleId) === roleFilter) &&
            (!s ||
                r.user?.name?.toLowerCase().includes(s) ||
                r.user?.email?.toLowerCase().includes(s))
    );

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">User Role</h1>
                <p className="text-sm text-slate-500">Assign roles to system users</p>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold">User Role List</h2>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            className="input sm:w-44"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="">All roles</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
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
                                placeholder="Search user..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <Button onClick={openNew} className="shrink-0 whitespace-nowrap">
                            <Plus size={16} className="mr-1.5" />
                            Assign Role
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">User</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">User Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {shown.map((r) => (
                                <tr
                                    key={`${r.userId}-${r.roleId}`}
                                    className="border-b last:border-0 hover:bg-slate-50"
                                >
                                    <td className="p-3">
                                        <div className="flex items-center gap-2.5">
                                            {r.user?.photoUrl ? (
                                                <img
                                                    src={r.user.photoUrl}
                                                    alt=""
                                                    className="h-8 w-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                                                    {r.user?.name?.charAt(0)?.toUpperCase()}
                                                </span>
                                            )}
                                            <span className="font-medium">{r.user?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600">{r.user?.email}</td>
                                    <td className="p-3">
                                        <Badge>{r.role?.name}</Badge>
                                    </td>
                                    <td className="p-3">
                                        {r.user?.status === "INACTIVE" ? (
                                            <span className="text-slate-500">Inactive</span>
                                        ) : (
                                            <span className="text-teal-700">Active</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap p-3 text-right">
                                        <button
                                            className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                            onClick={() => openEdit(r)}
                                            title="Edit user role"
                                            aria-label="Edit user role"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                            onClick={() => remove(r)}
                                            title="Remove user role"
                                            aria-label="Remove user role"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && shown.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-500">
                                        No user roles found
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
                title={editing ? "Edit User Role" : "Assign Role"}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
                    <div>
                        <Label required>User</Label>
                        <SearchSelect
                            options={users.map((u) => ({
                                value: String(u.id),
                                label: `${u.name} (${u.email})`,
                            }))}
                            value={f.userId}
                            onChange={(v) => setF({ ...f, userId: v })}
                            placeholder="Search user..."
                            required
                        />
                    </div>

                    <div>
                        <Label required>Role</Label>
                        <select
                            className="input"
                            value={f.roleId}
                            onChange={(e) => setF({ ...f, roleId: e.target.value })}
                            required
                        >
                            <option value="">Select role</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
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
