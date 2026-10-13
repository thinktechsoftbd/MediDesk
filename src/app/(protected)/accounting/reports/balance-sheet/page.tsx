"use client";
import { useState } from "react";
import { Card, Label, Button } from "@/components/ui";
import { Search, RotateCw, Loader2, FileDown } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const money = (n: number) => n.toFixed(2);

function Section({ title, rows, extra }: { title: string; rows: any[]; extra?: { name: string; amount: number } | null }) {
    const total = rows.reduce((s, x) => s + x.amount, 0) + (extra?.amount || 0);

    return (
        <div className="rounded-xl border">
            <div className="border-b bg-slate-50 px-4 py-2.5 font-semibold">
                {title}
            </div>

            <table className="w-full text-left text-sm">
                <tbody>
                    {rows.map((r: any) => (
                        <tr key={r.code} className="border-b last:border-0">
                            <td className="px-4 py-2.5">
                                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{r.code}</span>
                                {r.name}
                            </td>
                            <td className="px-4 py-2.5 text-right">{money(r.amount)}</td>
                        </tr>
                    ))}

                    {extra && (
                        <tr className="border-b last:border-0">
                            <td className="px-4 py-2.5 italic">{extra.name}</td>
                            <td className="px-4 py-2.5 text-right">{money(extra.amount)}</td>
                        </tr>
                    )}

                    <tr className="bg-slate-50 font-semibold">
                        <td className="px-4 py-2.5">Total {title}</td>
                        <td className="px-4 py-2.5 text-right">৳ {money(total)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default function BalanceSheet() {
    const [asOf, setAsOf] = useState(toYMD(new Date()));
    const [postedOnly, setPostedOnly] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const params = () => {
        const p = new URLSearchParams();
        if (asOf) p.set("asOf", asOf);
        if (postedOnly) p.set("postedOnly", "1");
        return p;
    };

    const exportPdf = () => window.open("/api/reports/balance-sheet/pdf?" + params(), "_blank");

    const run = async () => {
        setLoading(true);
        const r = await fetch("/api/reports/balance-sheet?" + params());
        setData(r.ok ? await r.json() : null);
        setLoading(false);
    };

    const balanced =
        data &&
        Math.abs(data.totals.assets - data.totals.liabilitiesEquity) < 0.005;

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Balance Sheet</h1>

                <p className="text-sm text-slate-500">
                    Assets against liabilities and equity as of a date.
                </p>
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-40">
                        <Label>As of</Label>

                        <DatePicker
                            selected={asOf ? new Date(asOf) : null}
                            onChange={(d: Date | null) =>
                                setAsOf(d ? toYMD(d) : "")
                            }
                            dateFormat="dd/MM/yyyy"
                            className="input"
                            wrapperClassName="w-full"
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

                    <Button onClick={run} disabled={loading}>
                        {loading ? (
                            <Loader2 size={16} className="mr-1.5 animate-spin" />
                        ) : (
                            <Search size={16} className="mr-1.5" />
                        )}
                        Run Report
                    </Button>

                    <Button variant="secondary" onClick={exportPdf}>
                        <FileDown size={16} className="mr-1.5" />
                        Export PDF
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setAsOf(toYMD(new Date()));
                            setPostedOnly(false);
                            setData(null);
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Reset
                    </Button>
                </div>

                {data ? (
                    <>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <Section title="Assets" rows={data.assets} />

                            <div className="space-y-4">
                                <Section title="Liabilities" rows={data.liabilities} />
                                <Section
                                    title="Equity"
                                    rows={data.equity}
                                    extra={{
                                        name: "Current Earnings (Income − Expense)",
                                        amount: data.currentEarnings,
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            className={`mt-4 rounded-xl p-4 text-sm font-semibold ${
                                balanced
                                    ? "bg-teal-50 text-teal-800"
                                    : "bg-red-50 text-red-700"
                            }`}
                        >
                            Assets ৳ {money(data.totals.assets)} — Liabilities +
                            Equity ৳ {money(data.totals.liabilitiesEquity)}{" "}
                            {balanced ? "· Balanced" : "· NOT balanced"}
                        </div>
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-500">
                        Press Run Report
                    </div>
                )}
            </Card>
        </div>
    );
}
