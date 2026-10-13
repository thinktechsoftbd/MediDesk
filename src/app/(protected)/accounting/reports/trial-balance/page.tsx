"use client";
import { useState } from "react";
import { Card, Label, Button } from "@/components/ui";
import { Search, RotateCw, Loader2, FileDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// credit balances (negative) shown in brackets, like the printed report
const amt = (n: number) => {
    const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < -0.004 ? `(${s})` : s;
};

const rowStyle = ["font-bold uppercase", "font-semibold pl-4", "font-medium pl-8", "pl-12 text-slate-600"];

const flatten = (nodes: any[], out: any[] = []) => {
    for (const n of nodes) {
        out.push(n);
        flatten(n.children || [], out);
    }
    return out;
};

export default function TrialBalance() {
    const today = new Date();
    const [dateFrom, setDateFrom] = useState(toYMD(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [dateTo, setDateTo] = useState(toYMD(today));
    const [postedOnly, setPostedOnly] = useState(false);
    const [showPatients, setShowPatients] = useState(false);
    const [showZero, setShowZero] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const params = () => {
        const p = new URLSearchParams();
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        if (postedOnly) p.set("postedOnly", "1");
        if (showPatients) p.set("showPatients", "1");
        if (showZero) p.set("showZero", "1");
        return p;
    };

    const run = async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/reports/trial-balance?" + params());
            if (!r.ok) throw new Error((await r.json().catch(() => null))?.error);
            setData(await r.json());
        } catch (e: any) {
            setData(null);
            toast.error(e?.message || "Failed to run report.");
        } finally {
            setLoading(false);
        }
    };

    const exportPdf = () => window.open("/api/reports/trial-balance/pdf?" + params(), "_blank");

    const rows = flatten(data?.roots || []);
    const total = data?.total;
    const unbalanced = total && Math.abs(total.closing) > 0.005;

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Trial Balance</h1>
                <p className="text-sm text-slate-500">
                    Opening balance, period transactions and closing balance by account group. Credit balances are shown in brackets.
                </p>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="sm:w-40">
                        <Label>From</Label>
                        <DatePicker
                            selected={dateFrom ? new Date(dateFrom) : null}
                            onChange={(d: Date | null) => setDateFrom(d ? toYMD(d) : "")}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>To</Label>
                        <DatePicker
                            selected={dateTo ? new Date(dateTo) : null}
                            onChange={(d: Date | null) => setDateTo(d ? toYMD(d) : "")}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            minDate={dateFrom ? new Date(dateFrom) : undefined}
                            isClearable
                        />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 pb-2 text-sm">
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={postedOnly} onChange={(e) => setPostedOnly(e.target.checked)} />
                            Posted only
                        </label>
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={showPatients} onChange={(e) => setShowPatients(e.target.checked)} />
                            Patient details
                        </label>
                        <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} />
                            Show zero heads
                        </label>
                    </div>

                    <Button onClick={run} disabled={loading}>
                        {loading ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Search size={16} className="mr-1.5" />}
                        Run Report
                    </Button>

                    <Button variant="secondary" onClick={exportPdf}>
                        <FileDown size={16} className="mr-1.5" />
                        Export PDF
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setDateFrom(toYMD(new Date(today.getFullYear(), today.getMonth(), 1)));
                            setDateTo(toYMD(today));
                            setPostedOnly(false);
                            setShowPatients(false);
                            setShowZero(false);
                            setData(null);
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Reset
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-y bg-slate-50 text-slate-600">
                                <th rowSpan={2} className="border-r p-2 text-left">Particulars</th>
                                <th rowSpan={2} className="border-r p-2 text-right">Opening Balance</th>
                                <th colSpan={2} className="border-b border-r p-2 text-center">Transactions</th>
                                <th rowSpan={2} className="p-2 text-right">Closing Balance</th>
                            </tr>
                            <tr className="border-b bg-slate-50 text-slate-600">
                                <th className="border-r p-2 text-right">Debit</th>
                                <th className="border-r p-2 text-right">Credit</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((n: any) => (
                                <tr
                                    key={n.key}
                                    className={`${n.level === 0 ? "border-t bg-teal-50/40" : ""} hover:bg-slate-50`}
                                >
                                    <td className={`border-r p-2 ${rowStyle[n.level] || ""}`}>
                                        {n.name}
                                    </td>
                                    {[n.opening, n.debit, n.credit, n.closing].map((v: number, i: number) => (
                                        <td
                                            key={i}
                                            className={`p-2 text-right tabular-nums ${i < 3 ? "border-r" : ""} ${n.level <= 2 ? "font-semibold" : "text-slate-600"}`}
                                        >
                                            {amt(v)}
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {total && rows.length > 0 && (
                                <tr className={`border-y-2 font-bold ${unbalanced ? "text-red-600" : ""}`}>
                                    <td className="border-r p-2">Grand Total</td>
                                    {[total.opening, total.debit, total.credit, total.closing].map((v: number, i: number) => (
                                        <td key={i} className={`p-2 text-right tabular-nums ${i < 3 ? "border-r" : ""}`}>
                                            ৳ {amt(v)}
                                        </td>
                                    ))}
                                </tr>
                            )}

                            {data && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No voucher entries for this period
                                    </td>
                                </tr>
                            )}

                            {!data && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Press Run Report
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {unbalanced && (
                    <p className="mt-3 text-sm text-red-600">
                        Closing balances do not net to zero. Check for unbalanced vouchers.
                    </p>
                )}
            </Card>
        </div>
    );
}
