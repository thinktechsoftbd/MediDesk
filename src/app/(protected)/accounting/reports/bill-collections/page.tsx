"use client";
import { useEffect, useState } from "react";
import { Card, Label, Button, SearchSelect } from "@/components/ui";
import { Search, RotateCw, Loader2, FileDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { TableLoader } from "@/components/loaders";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

const money = (n: number) => {
    const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < -0.004 ? `(${s})` : s;
};

export default function BillCollections() {
    const [patients, setPatients] = useState<any[]>([]);
    const [patientId, setPatientId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [runningOnly, setRunningOnly] = useState(true);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const params = (o: any = {}) => {
        const p = new URLSearchParams();
        const pid = o.patientId ?? patientId;
        const from = o.dateFrom ?? dateFrom;
        const to = o.dateTo ?? dateTo;
        const run = o.runningOnly ?? runningOnly;
        if (pid) p.set("patientId", pid);
        if (from) p.set("dateFrom", from);
        if (to) p.set("dateTo", to);
        p.set("runningOnly", run ? "1" : "0");
        return p;
    };

    const run = async (o: any = {}) => {
        setLoading(true);
        try {
            const r = await fetch("/api/reports/bill-collections?" + params(o));
            const d = await r.json().catch(() => null);
            if (!r.ok) throw new Error(d?.error);
            setData(d);
        } catch (e: any) {
            setData(null);
            toast.error(e?.message || "Failed to run report.", { duration: 8000 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch("/api/patients")
            .then((r) => r.json())
            .then((d) => setPatients(Array.isArray(d) ? d : []));

        // opened from a patient's Collection History: ?patientId=..
        const pid = new URLSearchParams(window.location.search).get("patientId") || "";
        setPatientId(pid);
        run({ patientId: pid });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const items = data?.items || [];

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Bill Collections</h1>
                <p className="text-sm text-slate-500">
                    Collections against each patient&apos;s service charge agreement, with dues left after every collection.
                </p>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="sm:w-72">
                        <Label>Patient</Label>
                        <SearchSelect
                            options={[
                                { value: "", label: "All Patients" },
                                ...patients.map((p) => ({ value: String(p.id), label: `${p.name} (${p.patientNo})` })),
                            ]}
                            value={patientId}
                            onChange={setPatientId}
                            placeholder="All Patients"
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>Collection From</Label>
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
                        <Label>Collection To</Label>
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

                    <label className="flex items-center gap-1.5 pb-2 text-sm">
                        <input type="checkbox" checked={runningOnly} onChange={(e) => setRunningOnly(e.target.checked)} />
                        Running Agreement
                    </label>

                    <Button onClick={() => run()} disabled={loading}>
                        {loading ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Search size={16} className="mr-1.5" />}
                        Search
                    </Button>

                    <Button variant="secondary" onClick={() => window.open("/api/reports/bill-collections/pdf?" + params(), "_blank")}>
                        <FileDown size={16} className="mr-1.5" />
                        Export PDF
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setPatientId("");
                            setDateFrom("");
                            setDateTo("");
                            setRunningOnly(true);
                            run({ patientId: "", dateFrom: "", dateTo: "", runningOnly: true });
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Reset
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50 text-slate-600">
                                <th className="p-3">Collection Date</th>
                                <th className="p-3">Patient Name</th>
                                <th className="p-3 text-right">Total Service Charge</th>
                                <th className="p-3 text-right">Collected Amount</th>
                                <th className="p-3 text-right">Discount</th>
                                <th className="p-3 text-right">Total Dues</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((r: any) => (
                                <tr key={r.paymentId} className="border-b hover:bg-slate-50">
                                    <td className="p-3 whitespace-nowrap">{fmtDate(r.collectionDate)}</td>
                                    <td className="p-3">
                                        <span className="font-medium">{r.patientName}</span>{" "}
                                        <span className="text-xs text-slate-500">({r.patientNo})</span>
                                        {r.isClosed === "Y" && (
                                            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">closed</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{money(r.totalServiceCharge)}</td>
                                    <td className="p-3 text-right tabular-nums">{money(r.collectedAmount)}</td>
                                    <td className="p-3 text-right tabular-nums">{money(r.discount)}</td>
                                    <td className={`p-3 text-right font-semibold tabular-nums ${r.totalDues > 0.004 ? "text-red-600" : "text-teal-700"}`}>
                                        {money(r.totalDues)}
                                    </td>
                                </tr>
                            ))}

                            {items.length > 0 && (
                                <tr className="border-t-2 font-bold">
                                    <td className="p-3" colSpan={3}>Total</td>
                                    <td className="p-3 text-right tabular-nums">৳ {money(data.totals.collected)}</td>
                                    <td className="p-3 text-right tabular-nums">৳ {money(data.totals.discount)}</td>
                                    <td className="p-3"></td>
                                </tr>
                            )}

                            {loading && items.length === 0 && <TableLoader colSpan={6} />}

                            {!loading && data && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No collections found for this filter
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
