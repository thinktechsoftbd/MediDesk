"use client";
import { useEffect, useState } from "react";
import { Card, Label, Button, SearchSelect } from "@/components/ui";
import { Search, RotateCw, Loader2, FileDown } from "lucide-react";
import DatePicker from "react-datepicker";
import toast from "react-hot-toast";
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

const money = (n: number) => n.toFixed(2);

export default function SubsidiaryLedger() {
    const [patients, setPatients] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [patientId, setPatientId] = useState("");
    const [accountId, setAccountId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [postedOnly, setPostedOnly] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
    }, []);

    const params = () => {
        const p = new URLSearchParams();
        if (patientId) p.set("patientId", patientId);
        if (accountId) p.set("accountId", accountId);
        if (dateFrom) p.set("dateFrom", dateFrom);
        if (dateTo) p.set("dateTo", dateTo);
        if (postedOnly) p.set("postedOnly", "1");
        return p;
    };

    const exportPdf = () => {
        if (!patientId && !accountId) {
            toast.error("Select a patient or a ledger head.");
            return;
        }
        window.open("/api/reports/patient-ledger/pdf?" + params(), "_blank");
    };

    const run = async () => {
        if (!patientId && !accountId) {
            toast.error("Select a patient or a ledger head.");
            return;
        }
        setLoading(true);
        const r = await fetch("/api/reports/patient-ledger?" + params());
        if (r.ok) setData(await r.json());
        else {
            setData(null);
            toast.error((await r.json().catch(() => null))?.error || "Failed to run report.");
        }
        setLoading(false);
    };

    // running balance (debit - credit)
    let running = 0;
    const rows = (data?.rows || []).map((r: any) => {
        running += r.debit - r.credit;
        return { ...r, balance: running };
    });

    const totDr = (data?.rows || []).reduce((s: number, r: any) => s + r.debit, 0);
    const totCr = (data?.rows || []).reduce((s: number, r: any) => s + r.credit, 0);

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Subsidiary Ledger</h1>

                <p className="text-sm text-slate-500">
                    Voucher lines by patient or ledger head with running balance. Select at least one.
                </p>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="sm:w-64">
                        <Label required={!accountId}>Patient</Label>

                        <SearchSelect
                            options={patients.map((p) => ({
                                value: String(p.id),
                                label: `${p.name} (${p.patientNo})`,
                            }))}
                            value={patientId}
                            onChange={setPatientId}
                            placeholder="Search patient..."
                        />
                    </div>

                    <div className="sm:w-64">
                        <Label required={!patientId}>Ledger Head</Label>

                        <SearchSelect
                            options={accounts.map((a) => ({
                                value: String(a.id),
                                label: `${a.mainCode} — ${a.mainName}`,
                            }))}
                            value={accountId}
                            onChange={setAccountId}
                            placeholder="Search ledger head..."
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>From</Label>

                        <DatePicker
                            selected={dateFrom ? new Date(dateFrom) : null}
                            onChange={(d: Date | null) =>
                                setDateFrom(d ? toYMD(d) : "")
                            }
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
                            onChange={(d: Date | null) =>
                                setDateTo(d ? toYMD(d) : "")
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            minDate={dateFrom ? new Date(dateFrom) : undefined}
                            isClearable
                        />
                    </div>

                    <label className="flex items-center gap-1.5 pb-2 text-sm">
                        <input
                            type="checkbox"
                            checked={postedOnly}
                            onChange={(e) => setPostedOnly(e.target.checked)}
                        />
                        Posted only
                    </label>

                    <Button onClick={run} disabled={(!patientId && !accountId) || loading}>
                        {loading ? (
                            <Loader2 size={16} className="mr-1.5 animate-spin" />
                        ) : (
                            <Search size={16} className="mr-1.5" />
                        )}
                        Run Report
                    </Button>

                    <Button variant="secondary" onClick={exportPdf} disabled={!patientId && !accountId}>
                        <FileDown size={16} className="mr-1.5" />
                        Export PDF
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setPatientId("");
                            setAccountId("");
                            setDateFrom("");
                            setDateTo("");
                            setPostedOnly(false);
                            setData(null);
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Reset
                    </Button>
                </div>

                {(data?.patient || data?.head) && (
                    <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-teal-50 p-3 text-sm">
                        {data.patient && (
                            <span>
                                Patient: <b>{data.patient.name}</b> ({data.patient.patientNo}) · {data.patient.phone}
                            </span>
                        )}
                        {data.head && (
                            <span>
                                Ledger Head: <b>{data.head}</b>
                            </span>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Date</th>
                                <th className="p-3">Voucher</th>
                                {!data?.patient && <th className="p-3">Patient</th>}
                                <th className="p-3">Ledger Head</th>
                                <th className="p-3">Narration</th>
                                <th className="p-3 text-right">Debit</th>
                                <th className="p-3 text-right">Credit</th>
                                <th className="p-3 text-right">Balance</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((r: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td className="p-3 whitespace-nowrap">
                                        {fmtDate(r.date)}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {r.voucherNo}
                                        {r.isPosted !== "Y" && (
                                            <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                                                draft
                                            </span>
                                        )}
                                    </td>

                                    {!data?.patient && (
                                        <td className="p-3 whitespace-nowrap">{r.patient || "-"}</td>
                                    )}

                                    <td className="p-3">{r.account}</td>

                                    <td className="p-3 max-w-[240px] truncate" title={r.narration}>
                                        {r.narration}
                                    </td>

                                    <td className="p-3 text-right">
                                        {r.debit ? money(r.debit) : ""}
                                    </td>

                                    <td className="p-3 text-right">
                                        {r.credit ? money(r.credit) : ""}
                                    </td>

                                    <td className="p-3 text-right font-medium">
                                        {money(r.balance)}
                                    </td>
                                </tr>
                            ))}

                            {rows.length > 0 && (
                                <tr className="font-semibold">
                                    <td className="p-3" colSpan={data?.patient ? 4 : 5}>
                                        Total
                                    </td>
                                    <td className="p-3 text-right">৳ {money(totDr)}</td>
                                    <td className="p-3 text-right">৳ {money(totCr)}</td>
                                    <td className="p-3 text-right">৳ {money(totDr - totCr)}</td>
                                </tr>
                            )}

                            {data && rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No entries found for this filter
                                    </td>
                                </tr>
                            )}

                            {!data && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        Pick a patient or a ledger head and press Run Report
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
