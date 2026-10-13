"use client";

import { useEffect, useState } from "react";
import { Lock, ReceiptText, Plus, Pencil, Save, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { BlockLoader } from "@/components/loaders";

export const tk = (n: number) =>
    Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "/=";

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

export const collectionHistoryUrl = (patientId: number) =>
    `/accounting/reports/bill-collections?patientId=${patientId}`;

export async function closeAgreement(a: any) {
    if (!confirm(`Close the running agreement of ${tk(a.serviceChargeAmount)}? New bill collections can no longer be linked to it.`))
        return false;
    const r = await fetch(`/api/agreements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close: true }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
        toast.error(d?.error || "Failed to close agreement.");
        return false;
    }
    toast.success("Agreement closed");
    return true;
}

// Service charge agreements of one patient: running one with actions, open new, history
export default function AgreementPanel({ patientId, canEdit }: { patientId: number; canEdit: boolean }) {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [edit, setEdit] = useState(false);
    const [f, setF] = useState({ serviceChargeAmount: "", agreementDetails: "" });
    const [busy, setBusy] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(`/api/patients/${patientId}/agreements`)
            .then((r) => r.json())
            .then((d) => setRows(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(load, [patientId]);

    const running = rows.find((r) => r.isClosed === "N");

    const startEdit = () => {
        setF({ serviceChargeAmount: String(running.serviceChargeAmount), agreementDetails: running.agreementDetails || "" });
        setEdit(true);
    };

    const saveEdit = async () => {
        setBusy(true);
        const r = await fetch(`/api/agreements/${running.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
        });
        setBusy(false);
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Failed to update agreement.");
        toast.success("Agreement updated");
        setEdit(false);
        load();
    };

    const openNew = async () => {
        setBusy(true);
        const r = await fetch(`/api/patients/${patientId}/agreements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
        });
        setBusy(false);
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Failed to open agreement.");
        toast.success("New agreement opened");
        setF({ serviceChargeAmount: "", agreementDetails: "" });
        load();
    };

    const remove = async (a: any) => {
        if (!confirm(`Delete agreement #${a.id}?`)) return;
        const r = await fetch(`/api/agreements/${a.id}`, { method: "DELETE" });
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Failed to delete agreement.", { duration: 6000 });
        toast.success("Agreement deleted");
        load();
    };

    if (loading && !rows.length) return <BlockLoader />;

    return (
        <div className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">Service Charge Agreement</div>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-teal-700 hover:bg-teal-50"
                    onClick={() => window.open(collectionHistoryUrl(patientId), "_blank")}
                >
                    <ReceiptText size={15} /> Collection History
                </button>
            </div>

            {running ? (
                <div className="rounded-lg bg-teal-50/60 p-3">
                    {edit ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                                <Label required>Total Service Charge</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={f.serviceChargeAmount}
                                    onChange={(e) => setF({ ...f, serviceChargeAmount: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Agreement Details</Label>
                                <Textarea
                                    className="input min-h-[42px] resize-y"
                                    rows={1}
                                    value={f.agreementDetails}
                                    onChange={(e) => setF({ ...f, agreementDetails: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 sm:col-span-2">
                                <Button type="button" variant="secondary" onClick={() => setEdit(false)}>
                                    <X size={15} className="mr-1" /> Cancel
                                </Button>
                                <Button type="button" onClick={saveEdit} disabled={busy} className="!bg-amber-500 hover:!bg-amber-600">
                                    <Save size={15} className="mr-1" /> Update
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-lg font-bold text-teal-800">
                                    Total Service Charge: {tk(running.serviceChargeAmount)}
                                </div>
                                <div className="mt-0.5 text-xs text-slate-600">
                                    Opened {fmtDate(running.openDate)} · Collected {tk(running.collected)} · Discount{" "}
                                    {tk(running.discount)} · <b>Dues {tk(running.dues)}</b>
                                </div>
                                {running.agreementDetails && (
                                    <div className="mt-1 text-sm text-slate-700">{running.agreementDetails}</div>
                                )}
                            </div>
                            {canEdit && (
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" onClick={startEdit}>
                                        <Pencil size={15} className="mr-1" /> Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        className="!bg-red-600 hover:!bg-red-700"
                                        onClick={async () => (await closeAgreement(running)) && load()}
                                    >
                                        <Lock size={15} className="mr-1" /> Close
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : canEdit ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                    <div>
                        <Label required>Total Service Charge</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={f.serviceChargeAmount}
                            onChange={(e) => setF({ ...f, serviceChargeAmount: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Agreement Details</Label>
                        <Input value={f.agreementDetails} onChange={(e) => setF({ ...f, agreementDetails: e.target.value })} />
                    </div>
                    <Button type="button" onClick={openNew} disabled={busy || !Number(f.serviceChargeAmount)}>
                        <Plus size={15} className="mr-1" /> Open Agreement
                    </Button>
                </div>
            ) : (
                <p className="text-sm text-slate-500">No running agreement.</p>
            )}

            {rows.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-2">#</th>
                                <th className="p-2 text-right">Service Charge</th>
                                <th className="p-2">Open Date</th>
                                <th className="p-2">Status</th>
                                <th className="p-2 text-right">Collected</th>
                                <th className="p-2 text-right">Dues</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((a) => (
                                <tr key={a.id} className="border-b last:border-0">
                                    <td className="p-2">{a.id}</td>
                                    <td className="p-2 text-right">{tk(a.serviceChargeAmount)}</td>
                                    <td className="p-2">{fmtDate(a.openDate)}</td>
                                    <td className="p-2">
                                        {a.isClosed === "Y" ? (
                                            <span className="text-slate-500">Closed {fmtDate(a.closedDate)}</span>
                                        ) : (
                                            <span className="font-medium text-teal-700">Running</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right">{tk(a.collected)}</td>
                                    <td className="p-2 text-right">{tk(a.dues)}</td>
                                    <td className="p-2 text-right">
                                        {canEdit && !a._count?.payments && (
                                            <button
                                                type="button"
                                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                                onClick={() => remove(a)}
                                                title="Delete agreement"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
