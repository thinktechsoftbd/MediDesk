"use client";

// Tooth selection chart (patient facing the doctor):
//
//   upper right 8..1 | 1..8 upper left
//   ----------------+----------------
//   lower right 8..1 | 1..8 lower left
//
// Saved in the Tooth Number text as FDI codes: UR 11-18, UL 21-28, LL 31-38, LR 41-48,
// e.g. "16, 26". Any other words already in the text (e.g. "All tooth") are kept.

import { TOOTH_CODE as CODE, selectedTeeth } from "@/lib/tooth";
export { selectedTeeth };

function rebuild(text: string, codes: Set<string>) {
    const others = String(text || "")
        .replace(CODE, " ")
        .split(/[,;\s]+/)
        .filter((w) => w && !/^[,;]+$/.test(w))
        .join(" ")
        .trim();
    const sorted = Array.from(codes).sort((a, b) => Number(a) - Number(b));
    return [others, sorted.join(", ")].filter(Boolean).join(", ");
}

const RIGHT = [8, 7, 6, 5, 4, 3, 2, 1];
const LEFT = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ToothChart({ value, onChange }: { value: string; onChange: (text: string) => void }) {
    const sel = selectedTeeth(value);

    const toggle = (code: string) => {
        const next = new Set(sel);
        next.has(code) ? next.delete(code) : next.add(code);
        onChange(rebuild(value, next));
    };

    const Row = ({ q, nums }: { q: number; nums: number[] }) => (
        <div className="flex justify-center gap-0.5">
            {nums.map((n) => {
                const code = `${q}${n}`;
                const on = sel.has(code);
                return (
                    <label
                        key={code}
                        title={`Tooth ${code}`}
                        className={`flex cursor-pointer select-none items-center gap-0.5 rounded-md border px-1 py-0.5 text-[13px] transition-colors ${
                            on ? "border-teal-500 bg-teal-50 font-semibold text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <input type="checkbox" className="h-3 w-3 accent-teal-600" checked={on} onChange={() => toggle(code)} />
                        {n}
                    </label>
                );
            })}
        </div>
    );

    return (
        <div className="overflow-x-auto rounded-xl border bg-white p-3">
            <div className="mx-auto w-max">
                <div className="mb-1 grid grid-cols-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>Upper Right</span>
                    <span>Upper Left</span>
                </div>

                <div className="grid grid-cols-[auto_auto]">
                    <div className="border-r-2 border-slate-300 pb-2 pr-2">
                        <Row q={1} nums={RIGHT} />
                    </div>
                    <div className="pb-2 pl-2">
                        <Row q={2} nums={LEFT} />
                    </div>
                    <div className="border-r-2 border-t-2 border-slate-300 pr-2 pt-2">
                        <Row q={4} nums={RIGHT} />
                    </div>
                    <div className="border-t-2 border-slate-300 pl-2 pt-2">
                        <Row q={3} nums={LEFT} />
                    </div>
                </div>

                <div className="mt-1 grid grid-cols-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>Lower Right</span>
                    <span>Lower Left</span>
                </div>
            </div>

            {sel.size > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Selected: <b className="text-slate-700">{Array.from(sel).sort((a, b) => Number(a) - Number(b)).join(", ")}</b>
                    </span>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => onChange(rebuild(value, new Set()))}>
                        Clear teeth
                    </button>
                </div>
            )}
        </div>
    );
}
