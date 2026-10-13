"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Modal, SearchSelect, Pagination } from "@/components/ui";
import { Plus, X, Save, Pencil, Trash2, RotateCw, FileCheck2, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { useCan } from "@/components/permissions-context";
import { tk } from "@/components/agreement-panel";
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

const TYPES = ["ADVANCE", "PAYMENT", "REFUND"];
const METHODS = ["CASH", "CARD", "BANK", "MOBILE_BANKING", "OTHER"];

const WALLETS = ["bKash", "Nagad", "Rocket"];

const empty = {
    patientId: "",
    agreementId: "",
    caseHistoryId: "",
    description: "",
    amount: "",
    discount: "0",
    dueAmount: "0",
    type: "PAYMENT",
    method: "CASH",
    paymentDate: "",
    walletProvider: "",
    walletNumber: "",
    walletTrxId: "",
};

export default function BillCollection() {
    const [loading, setLoading] = useState(true);
    const can = useCan();
    const [patients, setPatients] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [f, setF] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [patientCases, setPatientCases] = useState<any[]>([]);

    // service charge agreements of the patient chosen in the modal
    const [agreements, setAgreements] = useState<any[]>([]);
    useEffect(() => {
        if (!f.patientId) {
            setAgreements([]);
            return;
        }
        fetch(`/api/patients/${f.patientId}/agreements`)
            .then((r) => r.json())
            .then((d) => {
                const list = Array.isArray(d) ? d : [];
                setAgreements(list);
                // default to the running agreement
                setF((cur: any) => {
                    if (cur.agreementId) return cur;
                    const run = list.find((a: any) => a.isClosed === "N");
                    return run ? { ...cur, agreementId: String(run.id) } : cur;
                });
            });
    }, [f.patientId]);

    // cases of the patient chosen in the modal
    useEffect(() => {
        if (!f.patientId) {
            setPatientCases([]);
            return;
        }
        fetch(`/api/cases?patientId=${f.patientId}`)
            .then((r) => r.json())
            .then((d) => setPatientCases(Array.isArray(d) ? d : []));
    }, [f.patientId]);

    // filters
    const [fltPatient, setFltPatient] = useState("");
    const [fltType, setFltType] = useState("");
    const [fltMethod, setFltMethod] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const load = (
        pid = fltPatient,
        type = fltType,
        method = fltMethod,
        pg = page,
        ps = pageSize
    ) => {
        const params = new URLSearchParams({
            page: String(pg),
            pageSize: String(ps),
        });
        if (pid) params.set("patientId", pid);
        if (type) params.set("type", type);
        if (method) params.set("method", method);
        setLoading(true);
        fetch("/api/payments?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || []);
                setTotal(d.total || 0);
            })
            .finally(() => setLoading(false));
    };

    const search = (
        pid = fltPatient,
        type = fltType,
        method = fltMethod
    ) => {
        setPage(1);
        load(pid, type, method, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load(fltPatient, fltType, fltMethod, pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(fltPatient, fltType, fltMethod, 1, ps);
    };

    useEffect(() => {
        fetch("/api/patients")
            .then((r) => r.json())
            .then(setPatients);
        load();

        // returning from bKash checkout
        const bsp = new URLSearchParams(window.location.search);
        const bkash = bsp.get("bkash");
        if (bkash) {
            if (bkash === "success")
                toast.success(`bKash payment completed. TrxID ${bsp.get("trx") || ""}`);
            else if (bkash === "cancel")
                toast.error("bKash payment was cancelled.");
            else
                toast.error(`bKash payment failed${bsp.get("reason") ? `: ${bsp.get("reason")}` : "."}`);
            window.history.replaceState(null, "", "/payments");
        }

        // arriving from case history: ?patientId=..&caseId=..
        const sp = new URLSearchParams(window.location.search);
        const pid = sp.get("patientId");
        if (pid) {
            setEditing(null);
            setF({
                ...empty,
                patientId: pid,
                agreementId: "",
                caseHistoryId: sp.get("caseId") || "",
                paymentDate: toYMD(new Date()),
            });
            setModalOpen(true);
            window.history.replaceState(null, "", "/payments");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refresh = () => {
        setFltPatient("");
        setFltType("");
        setFltMethod("");
        setPage(1);
        load("", "", "", 1);
    };

    const openNew = () => {
        setEditing(null);
        setF({ ...empty, paymentDate: toYMD(new Date()) });
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p.id);
        setF({
            patientId: String(p.patientId),
            agreementId: p.agreementId ? String(p.agreementId) : "",
            caseHistoryId: p.caseHistoryId ? String(p.caseHistoryId) : "",
            description: p.description || "",
            amount: String(p.amount),
            discount: String(p.discount ?? 0),
            dueAmount: String(
                Math.max(
                    0,
                    Number(p.amount) -
                        Number(p.discount ?? 0) -
                        Number(p.paidAmount)
                )
            ),
            type: p.type,
            method: p.method,
            paymentDate: p.paymentDate?.slice(0, 10) || "",
            walletProvider: p.walletProvider || "",
            walletNumber: p.walletNumber || "",
            walletTrxId: p.walletTrxId || "",
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

        if (f.method === "MOBILE_BANKING") {
            if (!f.walletProvider) {
                toast.error("Select the mobile banking provider (bKash, Nagad or Rocket).");
                return;
            }
            if (f.walletProvider !== "bKash" && !f.walletTrxId.trim()) {
                toast.error("Enter the wallet Transaction ID (TrxID).");
                return;
            }
        }

        const res = await fetch(
            editing ? `/api/payments/${editing}` : "/api/payments",
            {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...f,
                    paidAmount: totalPaid,
                }),
            }
        );

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || "Failed to save transaction.");
            return;
        }

        toast.success(editing ? "Transaction updated" : "Transaction saved");
        closeModal();
        load();
    };

    const remove = async (p: any) => {
        if (!confirm(`Delete transaction ${p.invoiceNo}?`)) return;
        const r = await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Transaction deleted");
        else toast.error((await r.json().catch(() => null))?.error || "Failed to delete transaction.");
        load();
    };

    const payWithBkash = async (p: any) => {
        const r = await fetch("/api/bkash/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.bkashURL) {
            toast.error(d?.error || "Could not start bKash payment.");
            return;
        }
        window.location.href = d.bkashURL;
    };

    const finalize = async (p: any) => {
        if (!confirm(`Finalize ${p.invoiceNo}? A draft journal voucher will be created.`)) return;
        const r = await fetch(`/api/payments/${p.id}/finalize`, {
            method: "POST",
        });
        if (!r.ok) {
            toast.error((await r.json()).error || "Finalize failed");
            return;
        }
        toast.success("Draft journal voucher created");
        load();
    };

    const pageTotal = items.reduce((s, p) => s + Number(p.paidAmount), 0);

    // Total Paid = Amount - Discount - Due (never below zero)
    const totalPaid = Math.max(
        0,
        Number(f.amount || 0) -
            Number(f.discount || 0) -
            Number(f.dueAmount || 0)
    );
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Bill Collection
                    </h1>

                    <p className="text-sm text-slate-500">
                        Record and manage patient payments.
                    </p>
                </div>

                {can("PAYMENT.C") && (
                    <Button onClick={openNew}>
                        <Plus size={16} className="mr-1.5" />
                        New Transaction
                    </Button>
                )}
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-64">
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
                                search(v);
                            }}
                            placeholder="All Patients"
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>Type</Label>

                        <select
                            className="input"
                            value={fltType}
                            onChange={(e) => {
                                setFltType(e.target.value);
                                search(fltPatient, e.target.value);
                            }}
                        >
                            <option value="">All Types</option>
                            {TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:w-44">
                        <Label>Method</Label>

                        <select
                            className="input"
                            value={fltMethod}
                            onChange={(e) => {
                                setFltMethod(e.target.value);
                                search(fltPatient, fltType, e.target.value);
                            }}
                        >
                            <option value="">All Methods</option>
                            {METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={refresh}
                        title="Reset filters and reload"
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>
                </div>

                <div className="mb-5 rounded-xl bg-teal-50 p-4">
                    <div className="text-sm text-teal-700">
                        Total collected on this page
                    </div>

                    <div className="text-2xl font-bold text-teal-800">
                        ৳ {pageTotal.toFixed(2)}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Date</th>
                                <th className="p-3">Patient</th>
                                <th className="p-3">Case</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Method</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Discount</th>
                                <th className="p-3">Paid</th>
                                <th className="p-3">Due</th>
                                <th className="p-3">Voucher</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((p) => (
                                <tr key={p.id} className="border-b">
                                    <td className="p-3 whitespace-nowrap">
                                        {fmtDate(p.paymentDate)}
                                    </td>

                                    <td className="p-3 font-medium">
                                        {p.patient.name}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {p.caseHistory
                                            ? `Case-${String(p.caseHistory.caseNo).padStart(2, "0")}`
                                            : "-"}
                                    </td>

                                    <td className="p-3">{p.type}</td>
                                    <td
                                        className="p-3 whitespace-nowrap"
                                        title={
                                            p.walletTrxId
                                                ? `TrxID: ${p.walletTrxId}${p.walletNumber ? ` · ${p.walletNumber}` : ""}`
                                                : undefined
                                        }
                                    >
                                        {p.walletProvider || p.method}
                                        {p.walletTrxId && (
                                            <span className="ml-1 text-xs text-slate-400">
                                                #{p.walletTrxId}
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3">
                                        ৳ {Number(p.amount).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                        ৳ {Number(p.discount ?? 0).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                        ৳ {Number(p.paidAmount).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                        ৳ {(
                                            Number(p.amount) -
                                            Number(p.discount ?? 0) -
                                            Number(p.paidAmount)
                                        ).toFixed(2)}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {p.voucher ? (
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    p.voucher.isPosted === "Y"
                                                        ? "bg-teal-50 text-teal-700"
                                                        : "bg-amber-50 text-amber-700"
                                                }`}
                                                title={
                                                    p.voucher.isPosted === "Y"
                                                        ? "Voucher posted"
                                                        : "Draft voucher, not posted yet"
                                                }
                                            >
                                                {p.voucher.voucherNo}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">
                                                -
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {!p.voucher &&
                                            !p.walletTrxId &&
                                            p.method === "MOBILE_BANKING" &&
                                            (p.walletProvider === "bKash" ||
                                                !p.walletProvider) && (
                                                <button
                                                    className="rounded-lg p-1.5 text-pink-600 hover:bg-pink-50"
                                                    onClick={() => payWithBkash(p)}
                                                    title="Collect via bKash checkout"
                                                >
                                                    <Smartphone size={16} />
                                                </button>
                                            )}

                                        {!p.voucher && (
                                            <button
                                                className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => finalize(p)}
                                                title="Finalize: create draft journal voucher"
                                            >
                                                <FileCheck2 size={16} />
                                            </button>
                                        )}

                                        {!p.voucher && (
                                            <button
                                                className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                                onClick={() => openEdit(p)}
                                                title="Edit transaction"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {!p.voucher && (
                                            <button
                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                onClick={() => remove(p)}
                                                title="Delete transaction"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}

                                        {p.voucher && (
                                            <span
                                                className="px-1.5 text-xs text-slate-400"
                                                title="Locked: a journal voucher exists for this transaction"
                                            >
                                                Locked
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {loading && items.length === 0 && <TableLoader colSpan={11} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="p-8 text-center text-slate-500"
                                    >
                                        No transactions found
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
                title={editing ? "Update Transaction" : "New Transaction"}
                onClose={closeModal}
            >
                <form
                    onSubmit={save}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                    <div className="sm:col-span-2">
                        <Label required>Patient</Label>

                        <SearchSelect
                            options={patients.map((p) => ({
                                value: String(p.id),
                                label: `${p.name} — ${p.phone}`,
                            }))}
                            value={f.patientId}
                            onChange={(v) =>
                                setF({ ...f, patientId: v, caseHistoryId: "", agreementId: "" })
                            }
                            placeholder="Search patient by name or phone..."
                            required
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label required={agreements.some((a) => a.isClosed === "N")}>Service Charge Agreement</Label>

                        <select
                            className="input"
                            value={f.agreementId}
                            onChange={(e) => setF({ ...f, agreementId: e.target.value })}
                            disabled={!f.patientId}
                            required={agreements.some((a) => a.isClosed === "N")}
                        >
                            <option value="">
                                {!f.patientId
                                    ? "Select a patient first"
                                    : agreements.some((a) => a.isClosed === "N")
                                    ? "Select agreement"
                                    : "No running agreement"}
                            </option>
                            {agreements
                                .filter((a) => a.isClosed === "N" || String(a.id) === f.agreementId)
                                .map((a) => (
                                    <option key={a.id} value={a.id}>
                                        #{a.id} · Total Service Charge {tk(a.serviceChargeAmount)} · Dues {tk(a.dues)}
                                        {a.isClosed === "Y" ? " (closed)" : ""}
                                    </option>
                                ))}
                        </select>
                        {f.patientId && !agreements.some((a) => a.isClosed === "N") && (
                            <p className="mt-1 text-xs text-amber-700">
                                This patient has no running agreement. Open one from the patient&apos;s edit form to track dues.
                            </p>
                        )}
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Case History</Label>

                        <select
                            className="input"
                            value={f.caseHistoryId}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    caseHistoryId: e.target.value,
                                })
                            }
                            disabled={!f.patientId}
                        >
                            <option value="">
                                {f.patientId
                                    ? "No case (general payment)"
                                    : "Select a patient first"}
                            </option>

                            {patientCases.map((c) => (
                                <option key={c.id} value={c.id}>
                                    Case-{String(c.caseNo).padStart(2, "0")}
                                    {c.problem ? ` — ${c.problem}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Description</Label>

                        <Input
                            value={f.description}
                            onChange={(e) =>
                                setF({ ...f, description: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <Label required>Amount</Label>

                        <Input
                            type="number"
                            step="0.01"
                            value={f.amount}
                            onChange={(e) =>
                                setF({ ...f, amount: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div>
                        <Label>Discount</Label>

                        <Input
                            type="number"
                            step="0.01"
                            value={f.discount}
                            onChange={(e) =>
                                setF({ ...f, discount: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <Label>Due Amount</Label>

                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={f.dueAmount}
                            onChange={(e) =>
                                setF({ ...f, dueAmount: e.target.value })
                            }
                        />
                    </div>

                    <div>
                        <Label>Total Paid</Label>

                        <Input
                            value={totalPaid.toFixed(2)}
                            readOnly
                            className="bg-slate-50 font-semibold text-teal-700"
                        />
                    </div>

                    <div>
                        <Label>Payment Date</Label>

                        <DatePicker
                            selected={
                                f.paymentDate
                                    ? new Date(f.paymentDate)
                                    : null
                            }
                            onChange={(d: Date | null) =>
                                setF({
                                    ...f,
                                    paymentDate: d ? toYMD(d) : "",
                                })
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div>
                        <Label>Type</Label>

                        <select
                            className="input"
                            value={f.type}
                            onChange={(e) =>
                                setF({ ...f, type: e.target.value })
                            }
                        >
                            {TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Method</Label>

                        <select
                            className="input"
                            value={f.method}
                            onChange={(e) =>
                                setF({
                                    ...f,
                                    method: e.target.value,
                                    ...(e.target.value !== "MOBILE_BANKING"
                                        ? {
                                              walletProvider: "",
                                              walletNumber: "",
                                              walletTrxId: "",
                                          }
                                        : {}),
                                })
                            }
                        >
                            {METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {f.method === "MOBILE_BANKING" && (
                        <div className="rounded-xl bg-pink-50/60 p-3 sm:col-span-2">
                            <div className="mb-2 text-sm font-semibold text-slate-700">
                                Mobile Banking Payment
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <Label required>Provider</Label>

                                    <div className="flex items-center gap-4 pt-2">
                                        {WALLETS.map((w) => (
                                            <label
                                                key={w}
                                                className="flex cursor-pointer items-center gap-1.5 text-sm"
                                            >
                                                <input
                                                    type="radio"
                                                    name="walletProvider"
                                                    value={w}
                                                    checked={
                                                        f.walletProvider === w
                                                    }
                                                    onChange={() =>
                                                        setF({
                                                            ...f,
                                                            walletProvider: w,
                                                        })
                                                    }
                                                />
                                                {w}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Sender Wallet No</Label>

                                    <Input
                                        value={f.walletNumber}
                                        onChange={(e) =>
                                            setF({
                                                ...f,
                                                walletNumber: e.target.value,
                                            })
                                        }
                                        placeholder="01XXXXXXXXX"
                                    />
                                </div>

                                <div>
                                    <Label required>Transaction ID</Label>

                                    <Input
                                        value={f.walletTrxId}
                                        onChange={(e) =>
                                            setF({
                                                ...f,
                                                walletTrxId:
                                                    e.target.value.toUpperCase(),
                                            })
                                        }
                                        placeholder="e.g. 9HK3XW2B1A"
                                    />
                                </div>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                                {f.walletProvider === "bKash"
                                    ? "Save first, then use the bKash icon on the row to open the official bKash checkout — the TrxID fills in automatically after payment."
                                    : "Receive the money on the clinic wallet, then record the TrxID here as proof of payment."}
                            </p>
                        </div>
                    )}

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
                            {editing ? "Update" : "Save Transaction"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
