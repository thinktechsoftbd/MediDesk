import React from "react";
import { Directions, formPrefix, rowParts } from "@/lib/rx-directions";

// "Cap. Afix 400 mg" with the brand in bold
export function RxName({ medicine }: { medicine: any }) {
    if (!medicine) return null;
    const prefix = formPrefix(medicine.dosageForm);
    return (
        <span>
            {prefix && <span>{prefix} </span>}
            <b>{medicine.name}</b>
            {medicine.strength && <span> {medicine.strength}</span>}
        </span>
    );
}

// One Rx line as printed:
//   1. Cap. Afix 400 mg
//      ১ + ০ + ১      খাবারের পরে      ৭ দিন
//      instruction
// No hooks, so the print page (server) can use it too.
export default function RxLine({
    no,
    medicine,
    directions,
    actions,
    compact,
}: {
    no: number;
    medicine: any;
    directions: Directions | null;
    actions?: React.ReactNode;
    compact?: boolean;
}) {
    const rows = (directions?.rows || []).map(rowParts).filter((p) => p.dose || p.meal || p.dur);
    return (
        <div className={compact ? "py-1" : "py-2"}>
            <div className="flex items-start justify-between gap-2">
                <div className={`rx-name ${compact ? "text-[13px]" : "text-[15px]"}`}>
                    {no}. <RxName medicine={medicine} />
                </div>
                {actions && <div className="flex shrink-0 items-center gap-0.5 print:hidden">{actions}</div>}
            </div>
            <div className={`rx-detail pl-4 ${compact ? "text-[12px]" : "text-sm"} text-slate-700 print:text-black`}>
                {rows.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1.2fr_1.4fr_0.8fr] gap-2">
                        <span>{p.dose}</span>
                        <span>{p.meal}</span>
                        <span className="text-right">{p.dur}</span>
                    </div>
                ))}
                {directions?.note && <div className="whitespace-pre-line">{directions.note}</div>}
                {!rows.length && !directions?.note && !compact && (
                    <div className="text-xs italic text-amber-600 print:hidden">No directions yet</div>
                )}
            </div>
        </div>
    );
}
