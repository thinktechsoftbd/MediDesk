"use client";

import { useEffect, useRef, useState } from "react";

// One value per month as a line with a soft area under it. Single series, so no legend:
// the title names it. Hover shows a crosshair, a marker and the month's value.
export default function MonthLineChart({
    title,
    caption,
    data,
    color,
    format = (n: number) => String(n),
}: {
    title: string;
    caption?: string;
    data: { month: string; value: number }[]; // month: yyyy-mm
    color: string;
    format?: (n: number) => string;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const [W, setW] = useState(320);
    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setW(el.clientWidth || 320));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const H = 140, PAD_T = 10, PAD_X = 8;
    const max = Math.max(0, ...data.map((d) => d.value));
    const total = data.reduce((s, d) => s + d.value, 0);
    const step = data.length > 1 ? (W - PAD_X * 2) / (data.length - 1) : 0;
    const x = (i: number) => PAD_X + i * step;
    const y = (v: number) => (max > 0 ? H - (Math.max(v, 0) / max) * (H - PAD_T) : H);
    const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
    const area = data.length ? `${line} L${x(data.length - 1)},${H} L${x(0)},${H} Z` : "";

    const monthName = (ym: string, long = false) => {
        const [yy, mm] = ym.split("-").map(Number);
        return new Date(Date.UTC(yy, mm - 1, 1)).toLocaleDateString("en-GB", { month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" });
    };
    // every other month labelled, and always the last
    const showTick = (i: number) => (data.length - 1 - i) % 2 === 0;
    const h = hover ?? null;

    return (
        <div className="card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{format(total)}</div>
                    {caption && <div className="text-[11px] text-slate-500">{caption}</div>}
                </div>
            </div>

            <div ref={box} className="relative" onMouseLeave={() => setHover(null)}>
                <div className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400">{max > 0 ? format(max) : ""}</div>
                <svg width={W} height={H} className="block overflow-visible">
                    {/* recessive grid: top value + baseline */}
                    <line x1={0} x2={W} y1={PAD_T} y2={PAD_T} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1={0} x2={W} y1={H} y2={H} stroke="#cbd5e1" />
                    <path d={area} fill={color} opacity={0.12} />
                    <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    {h !== null && (
                        <>
                            <line x1={x(h)} x2={x(h)} y1={PAD_T} y2={H} stroke="#94a3b8" strokeDasharray="3 3" />
                            <circle cx={x(h)} cy={y(data[h].value)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
                        </>
                    )}
                    {/* hit targets: one column per month, wider than the marks */}
                    {data.map((d, i) => (
                        <rect
                            key={d.month}
                            x={x(i) - step / 2}
                            y={0}
                            width={Math.max(step, 8)}
                            height={H}
                            fill="transparent"
                            onMouseEnter={() => setHover(i)}
                        />
                    ))}
                </svg>

                {h !== null && (
                    <div
                        className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border bg-white px-2.5 py-1.5 text-xs shadow-md"
                        style={{ left: Math.min(Math.max(x(h), 60), W - 60) }}
                    >
                        <div className="text-slate-500">{monthName(data[h].month, true)}</div>
                        <div className="font-semibold text-slate-900">{format(data[h].value)}</div>
                    </div>
                )}

                <div className="relative mt-1 h-4 text-[10px] text-slate-500">
                    {data.map((d, i) =>
                        showTick(i) ? (
                            <span key={d.month} className="absolute -translate-x-1/2" style={{ left: x(i) }}>
                                {monthName(d.month)}
                            </span>
                        ) : null
                    )}
                </div>
            </div>
        </div>
    );
}
