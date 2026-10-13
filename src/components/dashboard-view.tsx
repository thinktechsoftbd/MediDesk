"use client";

import Link from "next/link";
import { Users, ClipboardList, Pill, CalendarClock, Wallet } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import MonthBarChart from "@/components/month-bar-chart";

const taka = (n: number) => `৳ ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// Stat cards, this month's charts and recent patients
export default function DashboardView({ d }: { d: any }) {
    const stats: any[] = [
        { label: "Active Patients", value: d.patients, icon: Users, tone: "bg-teal-50 border-teal-100", chip: "bg-teal-100 text-teal-700", href: "/patients", tip: "Open patient list" },
        { label: "Case Histories", value: d.cases, icon: ClipboardList, tone: "bg-sky-50 border-sky-100", chip: "bg-sky-100 text-sky-700", href: "/cases/list", tip: "Open case history list" },
        { label: "Prescriptions", value: d.prescriptions, icon: Pill, tone: "bg-violet-50 border-violet-100", chip: "bg-violet-100 text-violet-700" },
        {
            label: "Today's Appointments",
            value: d.todayAppointments,
            icon: CalendarClock,
            tone: "bg-amber-50 border-amber-100",
            chip: "bg-amber-100 text-amber-700",
            href: "/follow-ups",
            tip: "Open Next Follow-up list",
        },
        {
            label: "Today's Collection",
            value: `৳ ${Number(d.todayCollection || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
            icon: Wallet,
            tone: "bg-emerald-50 border-emerald-100",
            chip: "bg-emerald-100 text-emerald-700",
        },
    ];

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((s) => {
                    const card = (
                        <div className={`flex h-full items-center gap-3 rounded-2xl border p-4 ${s.tone}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.chip}`}>
                                <s.icon size={20} />
                            </span>
                            <div className="min-w-0">
                                <div className="truncate text-xs font-medium text-slate-600">{s.label}</div>
                                <div className="text-xl font-bold text-slate-900">{s.value}</div>
                            </div>
                        </div>
                    );
                    return s.href ? (
                        <Link key={s.label} href={s.href} className="block transition hover:-translate-y-0.5" title={s.tip}>
                            {card}
                        </Link>
                    ) : (
                        <div key={s.label}>{card}</div>
                    );
                })}
            </div>

            {d.month && (
                <>
                    <h2 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{d.month.label}</h2>
                    <div className="grid gap-3 lg:grid-cols-3">
                        <MonthBarChart title="Collection" data={d.month.collection} color="#0d9488" format={taka} today={d.month.today} href="/payments" />
                        <MonthBarChart title="Patient Enrollment" data={d.month.enrollment} color="#6366f1" today={d.month.today} href="/patients" />
                        <MonthBarChart title="Follow-ups" data={d.month.followUps} color="#d97706" today={d.month.today} href="/follow-ups" />
                    </div>
                </>
            )}

            <Card className="mt-4 p-4">
                <div className="mb-2 flex justify-between">
                    <h2 className="font-semibold">Recent Patients</h2>
                    <Badge>Live</Badge>
                </div>
                <div className="divide-y">
                    {d.recentPatients.map((p: any) => (
                        <div key={p.id} className="flex justify-between py-2.5 text-sm">
                            <span>{p.name}</span>
                            <span className="text-slate-500">{p.phone}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </>
    );
}
