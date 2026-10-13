"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, SearchSelect, Pagination, Textarea } from "@/components/ui";
import { Search, RotateCw, Eye, Pencil, Trash2, X, Save, Plus, CheckCircle2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

const money = (n: any) => Number(n || 0).toFixed(2);

const VOUCHER_TYPES = [
    "Cash Payment",
    "Cash Receive",
    "Bank Payment",
    "Bank Receive",
    "Journal",
    "Accounts Receivable for Sales",
    "Accounts Payable For Purchase",
    "Bill Voucher",
    "Adjustment Voucher",
];

const PAYMENT_MODES = ["Cash", "Cheque", "Account Transfer", "Wallet Transfer"];

const emptyForm = {
    voucherDate: "",
    voucherType: "Journal",
    paymentMode: "",
    narration: "",
    details: [
        { accMainClassId: "", debit: "", credit: "", lineNarration: "" },
        { accMainClassId: "", debit: "", credit: "", lineNarration: "" },
    ],
};

export default function JournalVouchers() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [fltType, setFltType] = useState("");
    const [fltPosted, setFltPosted] = useState("");
    const [fltPatient, setFltPatient] = useState("");
    const [patients, setPatients] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [checked, setChecked] = useState<number[]>([]);

    const [viewV, setViewV] = useState<any | null>(null);
    const [editV, setEditV] = useState<any | null>(null); // voucher being edited, null when adding
    const [formOpen, setFormOpen] = useState(false);
    const [ef, setEf] = useState<any>(null);
    const [err, setErr] = useState("");

    const load = (
        query = q,
        type = fltType,
        posted = fltPosted,
        pid = fltPatient,
        pg = page,
        ps = pageSize
    ) => {
        const params = new URLSearchParams({
            page: String(pg),
            pageSize: String(ps),
        });
        if (query.trim()) params.set("q", query.trim());
        if (type) params.set("voucherType", type);
        if (posted) params.set("isPosted", posted);
        if (pid) params.set("patientId", pid);
        setLoading(true);
        fetch("/api/vouchers?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || []);
                setTotal(d.total || 0);
                setChecked([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();

        fetch("/api/patients")
            .then((r) => r.json())
            .then((d) => setPatients(Array.isArray(d) ? d : []));

        fetch("/api/accounts/chart")
            .then((r) => r.json())
            .then((tree) => {
                if (!Array.isArray(tree)) return;
                const list: any[] = [];
                for (const pc of tree)
                    for (const ac of pc.acClasses)
                        for (const mc of ac.mainClasses) list.push(mc);
                setAccounts(list);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const search = (
        query = q,
        type = fltType,
        posted = fltPosted,
        pid = fltPatient
    ) => {
        setPage(1);
        load(query, type, posted, pid, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load(q, fltType, fltPosted, fltPatient, pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(q, fltType, fltPosted, fltPatient, 1, ps);
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const sums = (v: any) => ({
        dr: v.details.reduce((s: number, d: any) => s + Number(d.debit), 0),
        cr: v.details.reduce((s: number, d: any) => s + Number(d.credit), 0),
    });

    const toggleCheck = (id: number) =>
        setChecked((c) =>
            c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
        );

    const toggleAll = () =>
        setChecked((c) =>
            c.length === items.length ? [] : items.map((v) => v.id)
        );

    const batch = async (action: "post" | "unpost", ids = checked) => {
        if (!ids.length) return;
        const r = await fetch("/api/vouchers/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action }),
        });
        if (!r.ok) {
            toast.error((await r.json()).error || "Action failed");
            return;
        }
        toast.success(
            action === "post" ? "Voucher(s) posted" : "Voucher(s) unposted"
        );
        load();
    };

    const openNew = () => {
        setEditV(null);
        setErr("");
        setEf({ ...emptyForm, voucherDate: toYMD(new Date()) });
        setFormOpen(true);
    };

    const openEdit = (v: any) => {
        setEditV(v);
        setErr("");
        setEf({
            voucherDate: v.voucherDate?.slice(0, 10) || "",
            voucherType: v.voucherType || "Journal",
            paymentMode: v.paymentMode || "",
            narration: v.narration || "",
            details: v.details.map((d: any) => ({
                accMainClassId: String(d.accMainClassId),
                debit: Number(d.debit) ? String(d.debit) : "",
                credit: Number(d.credit) ? String(d.credit) : "",
                lineNarration: d.lineNarration || "",
            })),
        });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditV(null);
        setEf(null);
    };

    const setLine = (i: number, k: string, v: string) => {
        const details = [...ef.details];
        details[i] = { ...details[i], [k]: v };
        setEf({ ...ef, details });
    };

    const saveForm = async (e: any) => {
        e.preventDefault();
        const r = await fetch(
            editV ? `/api/vouchers/${editV.id}` : "/api/vouchers",
            {
                method: editV ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ef),
            }
        );
        if (!r.ok) {
            const msg = (await r.json()).error || "Save failed";
            setErr(msg);
            toast.error(msg);
            return;
        }
        toast.success(editV ? "Voucher updated" : "Voucher saved");
        closeForm();
        load();
    };

    const remove = async (v: any) => {
        if (!confirm(`Delete voucher ${v.voucherNo}?`)) return;
        const r = await fetch(`/api/vouchers/${v.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Voucher deleted");
        else toast.error((await r.json().catch(() => null))?.error || "Failed to delete voucher.");
        load();
    };

    const efDr = ef
        ? ef.details.reduce((s: number, d: any) => s + Number(d.debit || 0), 0)
        : 0;
    const efCr = ef
        ? ef.details.reduce((s: number, d: any) => s + Number(d.credit || 0), 0)
        : 0;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Journal Vouchers</h1>

                    <p className="text-sm text-slate-500">
                        Vouchers from bill collection and manual entries.
                    </p>
                </div>

                <Button onClick={openNew}>
                    <Plus size={16} className="mr-1.5" />
                    New Voucher
                </Button>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="sm:w-56">
                        <Label>Voucher No / Posting Id</Label>

                        <Input
                            placeholder="JV-000001, P-000001..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && search()}
                        />
                    </div>

                    <div className="sm:w-56">
                        <Label>Voucher Type</Label>

                        <select
                            className="input"
                            value={fltType}
                            onChange={(e) => {
                                setFltType(e.target.value);
                                search(q, e.target.value);
                            }}
                        >
                            <option value="">All Types</option>

                            {VOUCHER_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:w-40">
                        <Label>Posting Status</Label>

                        <select
                            className="input"
                            value={fltPosted}
                            onChange={(e) => {
                                setFltPosted(e.target.value);
                                search(q, fltType, e.target.value);
                            }}
                        >
                            <option value="">All</option>
                            <option value="Y">Posted</option>
                            <option value="N">Unposted</option>
                        </select>
                    </div>

                    <div className="sm:w-56">
                        <Label>Patient</Label>

                        <SearchSelect
                            options={[
                                { value: "", label: "All Patients" },
                                ...patients.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} — ${p.phone}`,
                                })),
                            ]}
                            value={fltPatient}
                            onChange={(v) => {
                                setFltPatient(v);
                                search(q, fltType, fltPosted, v);
                            }}
                            placeholder="All Patients"
                        />
                    </div>

                    <Button onClick={() => search()}>
                        <Search size={16} className="mr-1.5" />
                        Search
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            setFltType("");
                            setFltPosted("");
                            setFltPatient("");
                            setPage(1);
                            load("", "", "", "", 1);
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>

                    <div className="flex-1" />

                    <Button
                        onClick={() => batch("post")}
                        disabled={!checked.length}
                        title="Post the selected vouchers"
                    >
                        <CheckCircle2 size={16} className="mr-1.5" />
                        Post Selected ({checked.length})
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => batch("unpost")}
                        disabled={!checked.length}
                        title="Unpost the selected vouchers"
                    >
                        <Undo2 size={16} className="mr-1.5" />
                        Unpost Selected
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">
                                    <input
                                        type="checkbox"
                                        checked={
                                            items.length > 0 &&
                                            checked.length === items.length
                                        }
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="p-3">Voucher No</th>
                                <th className="p-3">Patient</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Posting Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Mode</th>
                                <th className="p-3">Narration</th>
                                <th className="p-3">Posted</th>
                                <th className="p-3 text-right">Debit</th>
                                <th className="p-3 text-right">Credit</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((v) => {
                                const t = sums(v);

                                return (
                                    <tr key={v.id} className="border-b">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={checked.includes(v.id)}
                                                onChange={() =>
                                                    toggleCheck(v.id)
                                                }
                                            />
                                        </td>

                                        <td className="p-3 font-medium">
                                            {v.voucherNo}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {v.payment?.patient
                                                ? `${v.payment.patient.name} (${v.payment.patient.patientNo})`
                                                : "-"}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {fmtDate(v.voucherDate)}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {v.isPosted === "Y"
                                                ? fmtDate(v.postingDate)
                                                : "-"}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {v.voucherType}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {v.paymentMode || "-"}
                                        </td>

                                        <td className="p-3 max-w-[220px] truncate" title={v.narration || ""}>
                                            {v.narration || "-"}
                                        </td>

                                        <td className="p-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    v.isPosted === "Y"
                                                        ? "bg-teal-50 text-teal-700"
                                                        : "bg-amber-50 text-amber-700"
                                                }`}
                                            >
                                                {v.isPosted === "Y"
                                                    ? "Posted"
                                                    : "Unposted"}
                                            </span>
                                        </td>

                                        <td className="p-3 text-right">
                                            ৳ {money(t.dr)}
                                        </td>

                                        <td className="p-3 text-right">
                                            ৳ {money(t.cr)}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            <button
                                                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                                                onClick={() => setViewV(v)}
                                                title="View voucher details"
                                            >
                                                <Eye size={16} />
                                            </button>

                                            <button
                                                className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                                onClick={() => openEdit(v)}
                                                title="Edit voucher"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                onClick={() => remove(v)}
                                                title="Delete voucher"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {loading && items.length === 0 && <TableLoader colSpan={12} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-slate-500">
                                        No vouchers yet. Finalize a bill
                                        collection transaction or create one
                                        manually.
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

            {/* Detail view */}
            <Modal
                open={!!viewV}
                title={viewV ? `Voucher ${viewV.voucherNo}` : ""}
                onClose={() => setViewV(null)}
            >
                {viewV && (
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-slate-500">Date: </span>
                                {fmtDate(viewV.voucherDate)}
                            </div>

                            <div>
                                <span className="text-slate-500">Type: </span>
                                {viewV.voucherType}
                            </div>

                            <div>
                                <span className="text-slate-500">
                                    Payment Mode:{" "}
                                </span>
                                {viewV.paymentMode || "-"}
                            </div>

                            <div>
                                <span className="text-slate-500">
                                    Posted:{" "}
                                </span>
                                {viewV.isPosted === "Y"
                                    ? `Yes · ${viewV.voucherPostingId || ""} · ${fmtDate(viewV.postingDate)}`
                                    : "No"}
                            </div>

                            <div className="col-span-2">
                                <span className="text-slate-500">
                                    Narration:{" "}
                                </span>
                                {viewV.narration || "-"}
                            </div>

                            {viewV.payment && (
                                <div className="col-span-2">
                                    <span className="text-slate-500">
                                        Linked invoice:{" "}
                                    </span>
                                    {viewV.payment.invoiceNo} ·{" "}
                                    {viewV.payment.patient?.name}
                                </div>
                            )}
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-slate-500">
                                    <th className="py-2">Account</th>
                                    <th className="py-2 text-right">Debit</th>
                                    <th className="py-2 text-right">Credit</th>
                                </tr>
                            </thead>

                            <tbody>
                                {viewV.details.map((d: any) => (
                                    <tr key={d.id} className="border-b">
                                        <td className="py-2">
                                            <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                                                {d.accMainClass.mainCode}
                                            </span>
                                            {d.accMainClass.mainName}
                                            {d.lineNarration && (
                                                <div className="text-xs text-slate-500">
                                                    {d.lineNarration}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-2 text-right">
                                            {Number(d.debit) ? `৳ ${money(d.debit)}` : ""}
                                        </td>

                                        <td className="py-2 text-right">
                                            {Number(d.credit) ? `৳ ${money(d.credit)}` : ""}
                                        </td>
                                    </tr>
                                ))}

                                <tr className="font-semibold">
                                    <td className="py-2">Total</td>
                                    <td className="py-2 text-right">
                                        ৳ {money(sums(viewV).dr)}
                                    </td>
                                    <td className="py-2 text-right">
                                        ৳ {money(sums(viewV).cr)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="flex justify-end gap-2">
                            {viewV.isPosted === "Y" ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        batch("unpost", [viewV.id]);
                                        setViewV(null);
                                    }}
                                >
                                    <Undo2 size={16} className="mr-1.5" />
                                    Unpost
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        batch("post", [viewV.id]);
                                        setViewV(null);
                                    }}
                                >
                                    <CheckCircle2 size={16} className="mr-1.5" />
                                    Post
                                </Button>
                            )}
                        </div>

                        <div className="text-xs text-slate-500">
                            Created {fmtDate(viewV.createdDate)}
                            {viewV.createdBy ? ` · ${viewV.createdBy}` : ""}
                            {viewV.updatedBy
                                ? ` — Updated ${fmtDate(viewV.updatedDate)} · ${viewV.updatedBy}`
                                : ""}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add / Edit */}
            <Modal
                open={formOpen}
                title={editV ? `Edit Voucher ${editV.voucherNo}` : "New Voucher"}
                onClose={closeForm}
            >
                {ef && (
                    <form onSubmit={saveForm} className="space-y-3">
                        <h3 className="border-b pb-1.5 text-sm font-semibold text-slate-700">
                            Master Data
                        </h3>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label required>Voucher Date</Label>

                                <DatePicker
                                    selected={
                                        ef.voucherDate
                                            ? new Date(ef.voucherDate)
                                            : null
                                    }
                                    onChange={(d: Date | null) =>
                                        setEf({
                                            ...ef,
                                            voucherDate: d ? toYMD(d) : "",
                                        })
                                    }
                                    dateFormat="dd/MM/yyyy"
                                    className="input"
                                    wrapperClassName="w-full"
                                />
                            </div>

                            <div>
                                <Label>Voucher Type</Label>

                                <select
                                    className="input"
                                    value={ef.voucherType}
                                    onChange={(e) =>
                                        setEf({
                                            ...ef,
                                            voucherType: e.target.value,
                                        })
                                    }
                                >
                                    {VOUCHER_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Payment Mode</Label>

                                <select
                                    className="input"
                                    value={ef.paymentMode}
                                    onChange={(e) =>
                                        setEf({
                                            ...ef,
                                            paymentMode: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Select</option>

                                    {PAYMENT_MODES.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {editV && (
                                <div>
                                    <Label>Posting Status</Label>

                                    <div className="pt-1.5">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                editV.isPosted === "Y"
                                                    ? "bg-teal-50 text-teal-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}
                                        >
                                            {editV.isPosted === "Y"
                                                ? `Posted · ${editV.voucherPostingId || ""} · ${fmtDate(editV.postingDate)}`
                                                : "Unposted"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <h3 className="border-b pb-1.5 pt-2 text-sm font-semibold text-slate-700">
                            Detail Data
                        </h3>

                        {ef.details.map((d: any, i: number) => (
                            <div key={i} className="rounded-xl bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Line {i + 1}
                                    </span>

                                    {ef.details.length > 2 && (
                                        <button
                                            type="button"
                                            className="text-red-600"
                                            onClick={() =>
                                                setEf({
                                                    ...ef,
                                                    details: ef.details.filter(
                                                        (_: any, j: number) =>
                                                            j !== i
                                                    ),
                                                })
                                            }
                                            title="Remove line"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>

                                <div className="mb-2">
                                    <Label required>Account Head</Label>

                                    <SearchSelect
                                        options={accounts.map((a) => ({
                                            value: String(a.id),
                                            label: `${a.mainCode} — ${a.mainName}`,
                                        }))}
                                        value={d.accMainClassId}
                                        onChange={(v) =>
                                            setLine(i, "accMainClassId", v)
                                        }
                                        placeholder="Search account..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Dr</Label>

                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={d.debit}
                                            onChange={(e) =>
                                                setLine(i, "debit", e.target.value)
                                            }
                                        />
                                    </div>

                                    <div>
                                        <Label>Cr</Label>

                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={d.credit}
                                            onChange={(e) =>
                                                setLine(i, "credit", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <Label>Note</Label>

                                    <Input
                                        value={d.lineNarration}
                                        onChange={(e) =>
                                            setLine(
                                                i,
                                                "lineNarration",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center justify-between text-sm">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    setEf({
                                        ...ef,
                                        details: [
                                            ...ef.details,
                                            {
                                                accMainClassId: "",
                                                debit: "",
                                                credit: "",
                                                lineNarration: "",
                                            },
                                        ],
                                    })
                                }
                            >
                                <Plus size={16} className="mr-1.5" />
                                Line
                            </Button>

                            <span
                                className={
                                    Math.abs(efDr - efCr) > 0.005
                                        ? "font-semibold text-red-600"
                                        : "font-semibold text-teal-700"
                                }
                            >
                                Dr ৳ {money(efDr)} · Cr ৳ {money(efCr)}
                            </span>
                        </div>

                        <div>
                            <Label>Narration</Label>

                            <Textarea
                                value={ef.narration}
                                onChange={(e) =>
                                    setEf({
                                        ...ef,
                                        narration: e.target.value,
                                    })
                                }
                            />
                        </div>

                        {err && <p className="text-sm text-red-600">{err}</p>}

                        <div className="flex items-center justify-between gap-2 pt-2">
                            <div>
                                {editV &&
                                    (editV.isPosted === "Y" ? (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                batch("unpost", [editV.id]);
                                                closeForm();
                                            }}
                                        >
                                            <Undo2 size={16} className="mr-1.5" />
                                            Unpost
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => {
                                                batch("post", [editV.id]);
                                                closeForm();
                                            }}
                                        >
                                            <CheckCircle2 size={16} className="mr-1.5" />
                                            Post
                                        </Button>
                                    ))}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeForm}
                                >
                                    <X size={16} className="mr-1.5" />
                                    Cancel
                                </Button>

                                <Button type="submit">
                                    <Save size={16} className="mr-1.5" />
                                    {editV ? "Update Voucher" : "Save Voucher"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
