"use client";

import { ADULT_TEETH, CHILD_TEETH, TOOTH_CODE, selectedTeeth } from "@/lib/teeth";

// Tooth selection chart (patient facing the doctor):
//
//   adult                                 child (primary teeth)
//   upper right 8..1 | 1..8 upper left    upper right E..A | A..E upper left
//   ----------------+----------------     ----------------+----------------
//   lower right 8..1 | 1..8 lower left    lower right E..A | A..E lower left
//
// Saved in the Tooth Number text as FDI codes (src/lib/teeth.ts), e.g. "16, 26".
// Any other words already in the text (e.g. "All tooth") are kept, and so are the codes of
// the other chart (switching Adult / Child does not drop teeth already picked).

function rebuild(text: string, codes: Set<string>) {
    const others = String(text || "")
        .replace(TOOTH_CODE, " ")
        .split(/[,;\s]+/)
        .filter((w) => w && !/^[,;]+$/.test(w))
        .join(" ")
        .trim();
    const sorted = Array.from(codes).sort((a, b) => Number(a) - Number(b));
    return [others, sorted.join(", ")].filter(Boolean).join(", ");
}

// compact: small toggle tiles instead of checkboxes, for narrow columns (prescription page)
// child: primary teeth A-E instead of 1-8
export default function ToothChart({
    value,
    onChange,
    compact,
    child,
}: {
    value: string;
    onChange: (text: string) => void;
    compact?: boolean;
    child?: boolean;
}) {
    const sel = selectedTeeth(value);
    const { q, right, left, label } = child ? CHILD_TEETH : ADULT_TEETH;

    const toggle = (code: string) => {
        const next = new Set(sel);
        next.has(code) ? next.delete(code) : next.add(code);
        onChange(rebuild(value, next));
    };

    const row = (quad: number, nums: number[]) => (
        <div className={`flex justify-center ${compact ? "gap-px" : "gap-0.5"}`}>
            {nums.map((n) => {
                const code = `${quad}${n}`;
                const on = sel.has(code);
                const title = child ? `Tooth ${code} (${label(n)})` : `Tooth ${code}`;
                return compact ? (
                    <button
                        key={code}
                        type="button"
                        title={title}
                        aria-pressed={on}
                        onClick={() => toggle(code)}
                        className={`h-[22px] w-[15px] select-none rounded border text-[10px] leading-none transition-colors ${
                            on ? "border-teal-600 bg-teal-600 font-semibold text-white" : "border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                    >
                        {label(n)}
                    </button>
                ) : (
                    <label
                        key={code}
                        title={title}
                        className={`flex cursor-pointer select-none items-center gap-0.5 rounded-md border px-1 py-0.5 text-[13px] transition-colors ${
                            on ? "border-teal-500 bg-teal-50 font-semibold text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <input type="checkbox" className="h-3 w-3 accent-teal-600" checked={on} onChange={() => toggle(code)} />
                        {label(n)}
                    </label>
                );
            })}
        </div>
    );

    // padding beside the cross lines (full class names, so Tailwind sees them)
    const pad = compact
        ? { ur: "pb-1 pr-1", ul: "pb-1 pl-1", lr: "pr-1 pt-1", ll: "pl-1 pt-1" }
        : { ur: "pb-2 pr-2", ul: "pb-2 pl-2", lr: "pr-2 pt-2", ll: "pl-2 pt-2" };

    return (
        <div className={`overflow-x-auto rounded-xl border bg-white ${compact ? "p-1" : "p-3"}`}>
            <div className="mx-auto w-max">
                <div className={`mb-1 grid grid-cols-2 text-center font-semibold uppercase tracking-wide text-slate-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
                    <span>Upper Right</span>
                    <span>Upper Left</span>
                </div>

                <div className="grid grid-cols-[auto_auto]">
                    {/* rows called as functions: as <Row /> they would remount (and lose focus) on every click */}
                    <div className={`border-r-2 border-slate-300 ${pad.ur}`}>{row(q.ur, right)}</div>
                    <div className={pad.ul}>{row(q.ul, left)}</div>
                    <div className={`border-r-2 border-t-2 border-slate-300 ${pad.lr}`}>{row(q.lr, right)}</div>
                    <div className={`border-t-2 border-slate-300 ${pad.ll}`}>{row(q.ll, left)}</div>
                </div>

                <div className={`mt-1 grid grid-cols-2 text-center font-semibold uppercase tracking-wide text-slate-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
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
