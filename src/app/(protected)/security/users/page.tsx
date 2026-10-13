"use client";

import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Badge, Modal } from "@/components/ui";
import { UserPlus, Pencil, Trash2, Save, Search } from "lucide-react";
import PhotoUpload from "@/components/photo-upload";
import toast from "react-hot-toast";

const empty = {
    name: "",
    email: "",
    password: "",
    roleId: "",
    photoUrl: "",
    status: "ACTIVE",
};

export default function Security() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [q, setQ] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [f, setF] = useState<any>(empty);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        fetch("/api/security/users")
            .then((r) => r.json())
            .then((d) => setUsers(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));

        fetch("/api/security/roles")
            .then((r) => r.json())
            .then((d) => setRoles(Array.isArray(d) ? d : []));
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setEditing(null);
        setF({ ...empty, roleId: roles[0]?.id ? String(roles[0].id) : "" });
        setModalOpen(true);
    };

    const openEdit = (u: any) => {
        setEditing(u);
        setF({
            name: u.name || "",
            email: u.email || "",
            password: "",
            roleId: u.roles?.[0]?.roleId ? String(u.roles[0].roleId) : "",
            photoUrl: u.photoUrl || "",
            status: u.status || "ACTIVE",
        });
        setModalOpen(true);
    };

    const save = async (e: any) => {
        e.preventDefault();
        setSaving(true);

        const res = await fetch(
            editing ? `/api/security/users/${editing.id}` : "/api/security/users",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            }
        );

        setSaving(false);

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || `Failed to ${editing ? "update" : "create"} user.`);
            return;
        }

        toast.success(editing ? "User updated" : "User created");
        setModalOpen(false);
        load();
    };

    const remove = async (u: any) => {
        if (!confirm(`Delete user ${u.name}?`)) return;
        const r = await fetch(`/api/security/users/${u.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("User deleted");
            load();
        } else {
            toast.error(
                (await r.json().catch(() => null))?.error || "Failed to delete user.",
                { duration: 6000 }
            );
        }
    };

    const s = q.trim().toLowerCase();
    const shown = s
        ? users.filter(
              (u) =>
                  u.name?.toLowerCase().includes(s) ||
                  u.email?.toLowerCase().includes(s)
          )
        : users;

    return (
        <div>
            <h1 className="mb-6 text-2xl font-bold">Users</h1>

            <div>
                {/* Users */}
                <Card className="p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-semibold">Users</h2>

                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-60">
                                <Search
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    className="input !pl-9"
                                    placeholder="Search name or email..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>

                            <Button onClick={openNew} className="shrink-0 whitespace-nowrap">
                                <UserPlus size={16} className="mr-1.5" />
                                New User
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b text-slate-500">
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {shown.map((u) => (
                                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2.5">
                                                {u.photoUrl ? (
                                                    <img
                                                        src={u.photoUrl}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                                                        {u.name?.charAt(0)?.toUpperCase()}
                                                    </span>
                                                )}
                                                <span className="font-medium">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-600">{u.email}</td>
                                        <td className="p-3">
                                            {u.roles?.map((x: any) => x.role.name).join(", ") || "-"}
                                        </td>
                                        <td className="p-3">
                                            {u.status === "INACTIVE" ? (
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <Badge>Active</Badge>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap p-3 text-right">
                                            <button
                                                className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                                onClick={() => openEdit(u)}
                                                title="Edit user"
                                                aria-label="Edit user"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                onClick={() => remove(u)}
                                                title="Delete user"
                                                aria-label="Delete user"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {loading && shown.length === 0 && <TableLoader colSpan={5} />}

                                {!loading && shown.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-slate-500">
                                            No users found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>

            <Modal
                open={modalOpen}
                title={editing ? "Edit User" : "New User"}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
                    <div>
                        <Label required>Name</Label>
                        <Input
                            value={f.name}
                            onChange={(e) => setF({ ...f, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label required>Email</Label>
                        <Input
                            type="email"
                            value={f.email}
                            onChange={(e) => setF({ ...f, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label required={!editing}>Password</Label>
                        <Input
                            type="password"
                            value={f.password}
                            placeholder={editing ? "Leave blank to keep current" : ""}
                            onChange={(e) => setF({ ...f, password: e.target.value })}
                            required={!editing}
                            autoComplete="new-password"
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

                    <div>
                        <Label>Status</Label>
                        <div className="flex h-[42px] items-center gap-5 text-sm">
                            {["ACTIVE", "INACTIVE"].map((st) => (
                                <label key={st} className="flex items-center gap-1.5">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={f.status === st}
                                        onChange={() => setF({ ...f, status: st })}
                                    />
                                    {st === "ACTIVE" ? "Active" : "Inactive"}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Label>Profile Photo</Label>
                        <PhotoUpload
                            value={f.photoUrl}
                            onChange={(v) => setF({ ...f, photoUrl: v })}
                            size={64}
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
                            {editing ? (
                                <Save size={16} className="mr-1.5" />
                            ) : (
                                <UserPlus size={16} className="mr-1.5" />
                            )}
                            {saving ? "Saving..." : editing ? "Update" : "Create User"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
