"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Pill, Printer } from "lucide-react";

// Screen-only bar above the pad; ?print=1 opens the print dialog once fonts are in
export default function PrintToolbar({ caseId }: { caseId: number }) {
    const sp = useSearchParams();
    useEffect(() => {
        if (sp.get("print") !== "1") return;
        let done = false;
        const go = () => {
            if (done) return;
            done = true;
            window.print();
        };
        document.fonts?.ready.then(() => setTimeout(go, 150));
        const t = setTimeout(go, 2500);
        // cleanup also stops the fonts callback (dev runs effects twice: one print dialog, not two)
        return () => {
            done = true;
            clearTimeout(t);
        };
    }, [sp]);

    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-white/90 px-4 py-2 text-sm shadow print:hidden">
            <button className="btn-primary" onClick={() => window.print()}>
                <Printer size={16} className="mr-1.5" />
                Print
            </button>
            <a className="btn-secondary" href={`/cases/${caseId}/prescription`}>
                <Pill size={16} className="mr-1.5" />
                Edit Rx
            </a>
            <span className="text-slate-500">For the pre-printed pad: A4, Margins None, Scale 100%.</span>
        </div>
    );
}
