"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Daily bars for one month. Single series, so no legend: the title names it.
// Bars sit on the baseline with rounded tops and a small gap; hover shows the day's value.
export default function MonthBarChart({
    title,
    data,
    color,
    format = (n: number) => String(n),
    today,
    href,
}: {
    title: string;
    data: { date: string; value: number }[];
    color: string;
    format?: (n: number) => string;
    today?: string;
    href?: string;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(0, ...data.map((d) => d.value));
    const total = data.reduce((s, d) => s + d.value, 0);
    const H = 140;

    const dayNo = (iso: string) => Number(iso.slice(8, 10));
    const showTick = (i: number) => {
        const n = i + 1;
        return n === 1 || n === data.length || (n % 5 === 0 && data.length - n >= 2);
    };
    const fmtDay = (iso: string) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    };

    return (
        <div className="card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
                {href ? (
                    <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-teal-700" title={`Open ${title}`}>
                        {title}
                        <ArrowUpRight size={14} className="text-slate-400 group-hover:text-teal-700" />
                    </Link>
                ) : (
                    <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
                )}
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{format(total)}</div>
                    <div className="text-[11px] text-slate-500">this month</div>
                </div>
            </div>

            <div className="relative" onMouseLeave={() => setHover(null)}>
                {/* recessive grid: top value + baseline */}
                <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
                <div className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400">
                    {max > 0 ? format(max) : ""}
                </div>

                <div className="flex items-end gap-[2px] border-b border-slate-300" style={{ height: H }}>
                    {data.map((d, i) => {
                        const h = max > 0 ? Math.max(d.value > 0 ? 3 : 0, (d.value / max) * (H - 8)) : 0;
                        const active = hover === i;
                        return (
                            <div
                                key={d.date}
                                className="relative flex h-full flex-1 cursor-default items-end"
                                onMouseEnter={() => setHover(i)}
                            >
                                <div
                                    className="w-full rounded-t-[4px] transition-opacity"
                                    style={{
                                        height: h,
                                        background: color,
                                        opacity: hover === null || active ? 1 : 0.45,
                                    }}
                                />
                                {active && (
                                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow">
                                        <div className="font-semibold">{format(d.value)}</div>
                                        <div className="text-slate-300">{fmtDay(d.date)}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-1 flex gap-[2px]">
                    {data.map((d, i) => (
                        <div
                            key={d.date}
                            className={`flex-1 text-center text-[10px] ${
                                d.date === today ? "font-bold text-slate-700" : "text-slate-400"
                            }`}
                        >
                            {showTick(i) || d.date === today ? dayNo(d.date) : ""}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
