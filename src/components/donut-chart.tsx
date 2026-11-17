"use client";

import { useState } from "react";

// Part-to-whole donut with its legend beside it: each part's name, amount and share are
// printed, so no part is told apart by color alone. Hover a slice or a legend row to pick it;
// the middle shows the picked part, else the total. Parts keep their color whatever their size.
export default function DonutChart({
    title,
    caption,
    data,
    format = (n: number) => String(n),
}: {
    title: string;
    caption?: string;
    data: { key: string; label: string; value: number; color: string }[];
    format?: (n: number) => string;
}) {
    const [hover, setHover] = useState<string | null>(null);
    const total = data.reduce((s, d) => s + d.value, 0);
    const S = 160, R = 60, SW = 22, C = 2 * Math.PI * R;
    const GAP = data.length > 1 ? 2 : 0; // surface gap between slices
    const picked = data.find((d) => d.key === hover) || null;
    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

    let at = 0;
    const slices = data.map((d) => {
        const len = total > 0 ? (d.value / total) * C : 0;
        const s = { ...d, dash: Math.max(len - GAP, 0.01), offset: -at };
        at += len;
        return s;
    });

    return (
        <div className="card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
                {caption && <span className="text-[11px] text-slate-500">{caption}</span>}
            </div>

            {total <= 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">No collections yet</p>
            ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col 2xl:flex-row">
                    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0" onMouseLeave={() => setHover(null)} role="img" aria-label={title}>
                        <g transform={`rotate(-90 ${S / 2} ${S / 2})`}>
                            {slices.map((s) => (
                                <circle
                                    key={s.key}
                                    cx={S / 2}
                                    cy={S / 2}
                                    r={R}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth={hover === s.key ? SW + 4 : SW}
                                    strokeDasharray={`${s.dash} ${C - s.dash}`}
                                    strokeDashoffset={s.offset}
                                    opacity={hover === null || hover === s.key ? 1 : 0.45}
                                    className="cursor-default transition-[opacity,stroke-width]"
                                    onMouseEnter={() => setHover(s.key)}
                                >
                                    <title>{`${s.label}: ${format(s.value)} (${pct(s.value)}%)`}</title>
                                </circle>
                            ))}
                        </g>
                        <text x="50%" y="46%" textAnchor="middle" className="fill-slate-500 text-[10px]">
                            {picked ? picked.label : "Total"}
                        </text>
                        <text x="50%" y="58%" textAnchor="middle" className="fill-slate-900 text-[13px] font-bold">
                            {format(picked ? picked.value : total)}
                        </text>
                    </svg>

                    <ul className="w-full min-w-0 space-y-1 text-sm">
                        {data.map((d) => (
                            <li
                                key={d.key}
                                onMouseEnter={() => setHover(d.key)}
                                onMouseLeave={() => setHover(null)}
                                className={`flex items-center gap-2 rounded-lg px-2 py-1 ${hover === d.key ? "bg-slate-50" : ""}`}
                            >
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                                <span className="min-w-0 flex-1 truncate text-slate-700">{d.label}</span>
                                <span className="font-medium text-slate-900">{format(d.value)}</span>
                                <span className="w-9 text-right text-xs text-slate-500">{pct(d.value)}%</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
