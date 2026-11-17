"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarRange, Hourglass, Wallet, ReceiptText, FileText } from "lucide-react";
import { Card } from "@/components/ui";
import PageLoader from "@/components/page-loader";
import OrgName from "@/components/org-name";
import MonthBarChart from "@/components/month-bar-chart";
import DonutChart from "@/components/donut-chart";
import MonthLineChart from "@/components/month-line-chart";
import { collectionHistoryUrl } from "@/components/agreement-panel";
import { dayKey } from "@/lib/clinic-time";

const taka = (n: number) => `৳ ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const takaExact = (n: number) => `৳ ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = dayKey(new Date(iso)).split("-");
    return `${d}/${m}/${y}`;
};
const METHOD_LABEL: Record<string, string> = { CASH: "Cash", CARD: "Card", BANK: "Bank", MOBILE_BANKING: "Mobile Banking", OTHER: "Other" };
// one color per payment method, whatever its share (categorical order, validated as a set)
const METHOD_COLOR: Record<string, string> = { CASH: "#2a78d6", MOBILE_BANKING: "#eb6834", CARD: "#1baf7a", BANK: "#eda100", OTHER: "#e87ba4" };

function ListCard({ title, href, linkLabel, children, empty }: { title: string; href: string; linkLabel: string; children: React.ReactNode[]; empty: string }) {
    return (
        <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{title}</h2>
                <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                    {linkLabel}
                    <ArrowUpRight size={13} />
                </Link>
            </div>
            <div className="divide-y">{children.length ? children : <p className="py-6 text-center text-sm text-slate-500">{empty}</p>}</div>
        </Card>
    );
}

// Collections at a glance: cards, this month's daily collection, by payment method, the
// last 12 months, and the recent pending collections, collections and vouchers.
export default function FinanceDeskView() {
    const [d, setD] = useState<any>();
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/finance-desk")
            .then(async (r) => {
                const j = await r.json().catch(() => null);
                if (!r.ok) throw new Error(j?.error || "Could not load the Finance Desk.");
                setD(j);
            })
            .catch((e) => setError(e.message));
    }, []);

    if (error) return <p className="card mx-auto mt-16 max-w-md p-8 text-center text-sm text-slate-600">{error}</p>;
    if (!d) return <PageLoader />;

    const cards = [
        { label: "Today's Collections", value: takaExact(d.cards.today), icon: Wallet, tone: "bg-emerald-50 border-emerald-100", chip: "bg-emerald-100 text-emerald-700" },
        { label: "Last 7 Days Collections", value: taka(d.cards.last7), icon: CalendarDays, tone: "bg-teal-50 border-teal-100", chip: "bg-teal-100 text-teal-700" },
        { label: "Last 30 Days Collections", value: taka(d.cards.last30), icon: CalendarRange, tone: "bg-sky-50 border-sky-100", chip: "bg-sky-100 text-sky-700" },
        {
            label: "Pending Collections",
            value: taka(d.cards.pending),
            note: `${d.cards.pendingPatients} patient${d.cards.pendingPatients === 1 ? "" : "s"} with dues`,
            icon: Hourglass,
            tone: "bg-amber-50 border-amber-100",
            chip: "bg-amber-100 text-amber-700",
        },
    ];

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Finance Desk</h1>
                    <p className="text-sm text-slate-500">
                        Collections and vouchers of <OrgName />
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/payments" className="btn btn-primary flex items-center gap-1.5 whitespace-nowrap">
                        <ReceiptText size={16} />
                        Bill Collection
                    </Link>
                    <Link href="/accounting/vouchers" className="btn-secondary flex items-center gap-1.5 whitespace-nowrap">
                        <FileText size={16} />
                        Vouchers
                    </Link>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((s) => (
                    <div key={s.label} className={`flex h-full items-center gap-3 rounded-2xl border p-4 ${s.tone}`}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.chip}`}>
                            <s.icon size={20} />
                        </span>
                        <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-slate-600">{s.label}</div>
                            <div className="text-xl font-bold text-slate-900">{s.value}</div>
                            {s.note && <div className="text-[11px] text-slate-500">{s.note}</div>}
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Collections</h2>
            <div className="grid gap-3 lg:grid-cols-3">
                <MonthBarChart title={`Collection, ${d.month.label}`} data={d.month.collection} color="#0d9488" format={taka} today={d.month.today} href="/accounting/reports/bill-collections" />
                <DonutChart
                    title="By Payment Method"
                    caption="last 30 days"
                    format={taka}
                    data={d.byMethod.map((x: any) => ({ key: x.key, label: x.label, value: x.value, color: METHOD_COLOR[x.key] || "#94a3b8" }))}
                />
                <MonthLineChart title="Monthly Collection" caption="last 12 months" data={d.monthly} color="#0d9488" format={taka} />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <ListCard title="Recent Pending Collections" href="/accounting/reports/bill-collections" linkLabel="Bill collections" empty="No pending collections">
                    {d.recentPending.map((a: any) => (
                        <Link key={a.agreementId} href={collectionHistoryUrl(a.patient.id)} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-slate-50" title="Open collection history">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-800">{a.patient.name}</span>
                                <span className="text-xs text-slate-500">
                                    {a.patient.patientNo} · charge {taka(a.serviceCharge)} · collected {taka(a.collected)}
                                </span>
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block font-semibold text-amber-700">{taka(a.dues)}</span>
                                <span className="text-[11px] text-slate-500">dues</span>
                            </span>
                        </Link>
                    ))}
                </ListCard>

                <ListCard title="Recent Collections" href="/payments" linkLabel="All collections" empty="No collections yet">
                    {d.recentCollections.map((p: any) => (
                        <Link key={p.id} href={collectionHistoryUrl(p.patient.id)} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-slate-50" title="Open collection history">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-800">{p.patient.name}</span>
                                <span className="text-xs text-slate-500">
                                    {fmtDate(p.date)} · {METHOD_LABEL[p.method] || p.method}
                                    {p.type === "REFUND" && " · Refund"}
                                </span>
                            </span>
                            <span className={`shrink-0 font-semibold ${p.amount < 0 ? "text-red-600" : "text-slate-900"}`}>{takaExact(p.amount)}</span>
                        </Link>
                    ))}
                </ListCard>

                <ListCard title="Recent Vouchers" href="/accounting/vouchers" linkLabel="All vouchers" empty="No vouchers yet">
                    {d.recentVouchers.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-800">{v.voucherNo}</span>
                                <span className="block truncate text-xs text-slate-500">
                                    {fmtDate(v.date)} · {v.type}
                                    {v.narration ? ` · ${v.narration}` : ""}
                                </span>
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block font-semibold text-slate-900">{takaExact(v.amount)}</span>
                                <span className={`text-[11px] font-medium ${v.isPosted ? "text-teal-700" : "text-slate-500"}`}>{v.isPosted ? "Posted" : "Unposted"}</span>
                            </span>
                        </div>
                    ))}
                </ListCard>
            </div>
        </div>
    );
}
