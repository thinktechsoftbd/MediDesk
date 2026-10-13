"use client";
import { useEffect, useState } from "react";
import { BlockLoader } from "@/components/loaders";
import { Card, Input, Label, Button } from "@/components/ui";
import { ChevronRight, ChevronDown, RotateCw, ListTree, FolderTree, Plus, Save, Trash2, Eraser } from "lucide-react";
import toast from "react-hot-toast";

// kind of the SELECTED node; childKind = what Add creates under it
type Kind = "ac" | "main" | "map" | "sub";
type Sel = { kind: Kind; node: any; parentCode: string } | null;

const childKind: Record<Kind, Kind | null> = {
    ac: "main",
    main: "map",
    map: "sub",
    sub: null,
};

const kindLabel: Record<string, string> = {
    main: "main class",
    map: "map class",
    sub: "sub class",
};

// One expandable row of the tree
function TreeNode({
    label,
    code,
    badge,
    level,
    children,
    defaultOpen = false,
    forceOpen,
    selected,
    onSelect,
}: {
    label: string;
    code?: string;
    badge?: string;
    level: number;
    children?: React.ReactNode;
    defaultOpen?: boolean;
    forceOpen?: boolean | null;
    selected?: boolean;
    onSelect?: () => void;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const hasChildren = !!children;
    const isOpen = forceOpen ?? open;

    return (
        <div>
            <div
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    selected
                        ? "bg-teal-600 text-white"
                        : level === 0
                          ? "font-semibold text-teal-800 hover:bg-slate-50"
                          : "hover:bg-slate-50"
                }`}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
            >
                <button
                    type="button"
                    className={`w-4 shrink-0 ${selected ? "text-white" : "text-slate-400"}`}
                    onClick={() => hasChildren && setOpen(!isOpen)}
                >
                    {hasChildren ? (
                        isOpen ? (
                            <ChevronDown size={15} />
                        ) : (
                            <ChevronRight size={15} />
                        )
                    ) : null}
                </button>

                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => {
                        if (onSelect) onSelect();
                        else if (hasChildren) setOpen(!isOpen);
                    }}
                >
                    {code && (
                        <span
                            className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
                                selected
                                    ? "bg-teal-500 text-white"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                        >
                            {code}
                        </span>
                    )}

                    <span className="truncate">{label}</span>

                    {badge && (
                        <span
                            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs ${
                                selected
                                    ? "bg-teal-500 text-white"
                                    : "bg-teal-50 text-teal-700"
                            }`}
                        >
                            {badge}
                        </span>
                    )}
                </button>
            </div>

            {hasChildren && isOpen && <div>{children}</div>}
        </div>
    );
}

export default function ChartOfAccounts() {
    const [loading, setLoading] = useState(true);
    const [tree, setTree] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [forceOpen, setForceOpen] = useState<boolean | null>(null);
    const [sel, setSel] = useState<Sel>(null);
    const [name, setName] = useState("");
    const [err, setErr] = useState("");

    const load = () => {
        setLoading(true);
        return fetch("/api/accounts/chart")
            .then((r) => r.json())
            .then((d) => setTree(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    const clearEntry = () => {
        setSel(null);
        setName("");
        setErr("");
    };

    const select = (kind: Kind, node: any, parentCode: string) => {
        setSel({ kind, node, parentCode });
        setName("");
        setErr("");
    };

    const ownCode = (s: NonNullable<Sel>) =>
        s.kind === "ac"
            ? s.node.acCode
            : s.kind === "main"
              ? s.node.mainCode
              : s.kind === "map"
                ? s.node.mapCode
                : s.node.subCode;

    const ownName = (s: NonNullable<Sel>) =>
        s.kind === "ac"
            ? s.node.className
            : s.kind === "main"
              ? s.node.mainName
              : s.kind === "map"
                ? s.node.mapName
                : s.node.subName;

    const doAdd = async () => {
        if (!sel) return setErr("Select a node in the tree first.");
        const kind = childKind[sel.kind];
        if (!kind) return setErr("Sub classes cannot have children.");
        if (!name.trim()) return setErr("Name is required");
        const r = await fetch("/api/accounts/coa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, parentId: sel.node.id, name }),
        });
        if (!r.ok) return setErr((await r.json()).error || "Add failed");
        toast.success("Account added");
        setName("");
        setErr("");
        load();
    };

    const doUpdate = async () => {
        if (!sel || sel.kind === "ac")
            return setErr("Select a main, map or sub class to update.");
        if (!name.trim()) return setErr("Name is required");
        const r = await fetch("/api/accounts/coa", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: sel.kind, id: sel.node.id, name }),
        });
        if (!r.ok) return setErr((await r.json()).error || "Update failed");
        toast.success("Account renamed");
        clearEntry();
        load();
    };

    const doDelete = async () => {
        if (!sel || sel.kind === "ac")
            return setErr("Select a main, map or sub class to delete.");
        if (!confirm(`Delete "${ownName(sel)}"?`)) return;
        const r = await fetch(
            `/api/accounts/coa?kind=${sel.kind}&id=${sel.node.id}`,
            { method: "DELETE" }
        );
        if (!r.ok) return setErr((await r.json()).error || "Delete failed");
        toast.success("Account deleted");
        clearEntry();
        load();
    };

    // filter the tree by name/code, keeping ancestors of matches
    const s = q.trim().toLowerCase();
    const match = (t?: string | null) => !!t && t.toLowerCase().includes(s);

    const filtered = !s
        ? tree
        : tree
              .map((pc) => {
                  const acClasses = pc.acClasses
                      .map((ac: any) => {
                          const mainClasses = ac.mainClasses.filter(
                              (mc: any) =>
                                  match(mc.mainName) ||
                                  match(mc.mainCode) ||
                                  mc.mapClasses.some(
                                      (mp: any) =>
                                          match(mp.mapName) ||
                                          match(mp.mapCode) ||
                                          mp.subClasses.some(
                                              (sc: any) =>
                                                  match(sc.subName) ||
                                                  match(sc.subCode)
                                          )
                                  )
                          );
                          if (match(ac.className) || match(ac.acCode))
                              return ac;
                          return mainClasses.length
                              ? { ...ac, mainClasses }
                              : null;
                      })
                      .filter(Boolean);
                  if (match(pc.name)) return pc;
                  return acClasses.length ? { ...pc, acClasses } : null;
              })
              .filter(Boolean);

    const addTarget = sel ? childKind[sel.kind] : null;

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Chart of Accounts</h1>

                <p className="text-sm text-slate-500">
                    Account class hierarchy in tree view.
                </p>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-2">
                {/* Tree */}
                <Card className="p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <Label>Search</Label>

                            <Input
                                placeholder="Account name or code..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => setForceOpen(true)}
                        >
                            <FolderTree size={16} className="mr-1.5" />
                            Expand All
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => setForceOpen(false)}
                        >
                            <ListTree size={16} className="mr-1.5" />
                            Collapse All
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => {
                                setQ("");
                                setForceOpen(null);
                                clearEntry();
                                load();
                            }}
                            title="Reload the tree"
                        >
                            <RotateCw size={16} />
                        </Button>
                    </div>

                    <div className="rounded-xl border p-2">
                        {filtered.map((pc: any) => (
                            <TreeNode
                                key={pc.id}
                                label={pc.name}
                                code={pc.parentCode}
                                level={0}
                                defaultOpen
                                forceOpen={forceOpen}
                            >
                                {pc.acClasses.map((ac: any) => (
                                    <TreeNode
                                        key={ac.id}
                                        label={ac.className}
                                        code={ac.acCode}
                                        badge={
                                            ac.mainClasses.length
                                                ? `${ac.mainClasses.length}`
                                                : undefined
                                        }
                                        level={1}
                                        forceOpen={forceOpen}
                                        selected={
                                            sel?.kind === "ac" &&
                                            sel.node.id === ac.id
                                        }
                                        onSelect={() =>
                                            select("ac", ac, pc.parentCode)
                                        }
                                    >
                                        {ac.mainClasses.map((mc: any) => (
                                            <TreeNode
                                                key={mc.id}
                                                label={mc.mainName}
                                                code={mc.mainCode}
                                                badge={
                                                    mc.mapClasses.length
                                                        ? `${mc.mapClasses.length}`
                                                        : undefined
                                                }
                                                level={2}
                                                forceOpen={forceOpen}
                                                selected={
                                                    sel?.kind === "main" &&
                                                    sel.node.id === mc.id
                                                }
                                                onSelect={() =>
                                                    select(
                                                        "main",
                                                        mc,
                                                        ac.acCode
                                                    )
                                                }
                                            >
                                                {mc.mapClasses.map(
                                                    (mp: any) => (
                                                        <TreeNode
                                                            key={mp.id}
                                                            label={mp.mapName}
                                                            code={mp.mapCode}
                                                            badge={
                                                                mp.subClasses
                                                                    .length
                                                                    ? `${mp.subClasses.length}`
                                                                    : undefined
                                                            }
                                                            level={3}
                                                            forceOpen={
                                                                forceOpen
                                                            }
                                                            selected={
                                                                sel?.kind ===
                                                                    "map" &&
                                                                sel.node.id ===
                                                                    mp.id
                                                            }
                                                            onSelect={() =>
                                                                select(
                                                                    "map",
                                                                    mp,
                                                                    mc.mainCode
                                                                )
                                                            }
                                                        >
                                                            {mp.subClasses.map(
                                                                (sc: any) => (
                                                                    <TreeNode
                                                                        key={sc.id}
                                                                        label={sc.subName}
                                                                        code={sc.subCode}
                                                                        level={4}
                                                                        selected={
                                                                            sel?.kind ===
                                                                                "sub" &&
                                                                            sel.node.id ===
                                                                                sc.id
                                                                        }
                                                                        onSelect={() =>
                                                                            select(
                                                                                "sub",
                                                                                sc,
                                                                                mp.mapCode
                                                                            )
                                                                        }
                                                                    />
                                                                )
                                                            )}
                                                        </TreeNode>
                                                    )
                                                )}
                                            </TreeNode>
                                        ))}
                                    </TreeNode>
                                ))}
                            </TreeNode>
                        ))}

                        {loading && filtered.length === 0 && <BlockLoader />}

                        {!loading && filtered.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                No accounts found
                            </div>
                        )}
                    </div>
                </Card>

                {/* Entry section */}
                <Card className="p-5">
                    <h2 className="mb-4 font-semibold">
                        Chart of Account Entry Section
                    </h2>

                    <div className="space-y-3">
                        <div>
                            <Label>Parent</Label>

                            <Input
                                value={sel ? sel.parentCode || "" : ""}
                                readOnly
                                className="bg-slate-50"
                                placeholder="Select a node in the tree"
                            />
                        </div>

                        <div>
                            <Label>Code</Label>

                            <Input
                                value={sel ? ownCode(sel) || "" : ""}
                                readOnly
                                className="bg-slate-50"
                                placeholder="Auto generated"
                            />
                        </div>

                        <div>
                            <Label required>Name</Label>

                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={
                                    sel
                                        ? addTarget
                                            ? `New ${kindLabel[addTarget]} name, or new name for "${ownName(sel)}"`
                                            : `New name for "${ownName(sel)}"`
                                        : "Name"
                                }
                            />
                        </div>

                        {err && (
                            <p className="text-sm text-red-600">{err}</p>
                        )}

                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button
                                onClick={doAdd}
                                disabled={!sel || !addTarget}
                                title={
                                    addTarget
                                        ? `Add a ${kindLabel[addTarget]} under the selected node`
                                        : "Add"
                                }
                            >
                                <Plus size={16} className="mr-1.5" />
                                Add
                            </Button>

                            <Button
                                onClick={doUpdate}
                                disabled={!sel || sel.kind === "ac"}
                                title="Rename the selected node"
                            >
                                <Save size={16} className="mr-1.5" />
                                Update
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={clearEntry}
                            >
                                <Eraser size={16} className="mr-1.5" />
                                Clear
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={doDelete}
                                disabled={!sel || sel.kind === "ac"}
                                className="!text-red-600"
                                title="Delete the selected node"
                            >
                                <Trash2 size={16} className="mr-1.5" />
                                Delete
                            </Button>
                        </div>

                        <p className="pt-2 text-xs text-slate-500">
                            Select a node in the tree. Type a name and press
                            Add to create a child under it (AC class → main
                            class → map class → sub class) with an auto
                            generated code. Press Update to rename the
                            selected node, or Delete to remove it. Nodes with
                            children cannot be deleted.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
