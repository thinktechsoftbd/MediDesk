import React from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import RxLine from "@/components/rx/rx-line";
import { directionsOf } from "@/lib/rx-directions";
import { joinFindings, sectionItems } from "@/lib/clinical-findings";
import { ADULT_TEETH, CHILD_TEETH, TeethLayout, selectedTeeth } from "@/lib/teeth";
import PrintToolbar from "./print-toolbar";

export const dynamic = "force-dynamic";

// ============================================================
// PAD PRINT: prints ONLY the values onto the pre-printed A4 pad,
// as HTML so Bangla directions render (the old PDF route could not).
// All positions are in millimetres from the TOP-LEFT of the page.
// Print a test page, measure how far each value is off, and
// adjust the numbers below (bigger y = lower, bigger x = right).
// ============================================================
const POS = {
    name: { x: 22, y: 36.5 }, // after "Name:"
    sexM: { x: 116.5, y: 36.5 }, // tick over the M box
    sexF: { x: 125, y: 36.5 }, // tick over the F box
    age: { x: 147, y: 36.2 }, // after "Age:"
    date: { x: 172, y: 36.2 }, // after "Date:"
    // the left column ends at the pad's vertical line, about 66mm from the left edge:
    // keep x + w (and the tooth charts, about 52mm wide) left of it
    cc: { x: 16, y: 60, w: 49 }, // C/C block (problem)
    oe: { x: 16, y: 92, w: 49, teethX: 10 }, // O/E block; its tooth chart below the text, from teethX
    bp: { x: 13, y: 135 }, // after "B/P:"
    adv: { x: 6, y: 205, w: 59, teethX: 6 }, // ADV: block: the diagnosis; the Advice tooth chart below it
    rx: { x: 82, y: 58, w: 115, adviceGap: 6 }, // Rx column: medicines, then the advice adviceGap mm below
    sign: { x: 150, y: 190, w: 42, h: 18 }, // doctor's signature, lower right of the Rx column
};

// Arial for English, then the Bangla fonts Windows / Android / Mac have
const PAD_CSS = `
    @page { size: A4; margin: 0; }
    body { background: #e2e8f0; }
    .pad { font-family: Arial, "Nirmala UI", "Vrinda", "Noto Sans Bengali", "Hind Siliguri", "SolaimanLipi", sans-serif; font-size: 11pt; color: #000; }
    .pad .rx-name { font-size: 11pt; }
    .pad .rx-detail { font-size: 9.5pt; }
    @media print {
        body { background: #fff; }
        .pad { margin: 0 !important; box-shadow: none !important; }
    }
`;

const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function At({ x, y, w, children }: { x: number; y: number; w?: number; children: React.ReactNode }) {
    return (
        <div className="absolute whitespace-pre-line" style={{ left: `${x}mm`, top: `${y}mm`, ...(w ? { width: `${w}mm` } : {}) }}>
            {children}
        </div>
    );
}

// Tooth chart as drawn by hand on the pad, picked teeth circled:
//   87654321 | 12345678        (child: EDCBA | ABCDE)
//   ---------+---------
//   87654321 | 12345678
// Only the case's chart (Adult or Child): teeth picked on the other chart before switching are
// kept in the text but not printed.
// dx: mm left (-) or right (+) of the text block it sits under.
function PadTeeth({ text, child, dx = 0 }: { text: string | null; child: boolean; dx?: number }) {
    return (
        <div style={{ marginTop: "3mm", marginLeft: `${dx}mm` }}>
            <TeethCross layout={child ? CHILD_TEETH : ADULT_TEETH} sel={selectedTeeth(text || "")} />
        </div>
    );
}

function TeethCross({ layout, sel }: { layout: TeethLayout; sel: Set<string> }) {
    const line = "0.3mm solid #000";
    const row = (quad: number, nums: number[]) => (
        <div style={{ display: "flex" }}>
            {nums.map((n) => (
                <span
                    key={n}
                    style={{
                        width: "3.1mm",
                        flexShrink: 0,
                        height: "4.2mm",
                        lineHeight: "4mm",
                        textAlign: "center",
                        fontSize: "10pt",
                        boxSizing: "border-box",
                        borderRadius: "50%",
                        border: sel.has(`${quad}${n}`) ? "0.3mm solid #000" : "0.3mm solid transparent",
                    }}
                >
                    {layout.label(n)}
                </span>
            ))}
        </div>
    );
    return (
        // one chart per line, as wide as its teeth (never squeezed by the text block's width)
        <div style={{ display: "grid", width: "max-content", gridTemplateColumns: "auto auto", marginBottom: "1.5mm" }}>
            <div style={{ borderRight: line, borderBottom: line, padding: "0 1mm 0.6mm 0" }}>{row(layout.q.ur, layout.right)}</div>
            <div style={{ borderBottom: line, padding: "0 0 0.6mm 1mm" }}>{row(layout.q.ul, layout.left)}</div>
            <div style={{ borderRight: line, padding: "0.6mm 1mm 0 0" }}>{row(layout.q.lr, layout.right)}</div>
            <div style={{ padding: "0.6mm 0 0 1mm" }}>{row(layout.q.ll, layout.left)}</div>
        </div>
    );
}

function Tick() {
    return (
        <svg width="3.5mm" height="3.5mm" viewBox="0 0 10 10">
            <path d="M1.5 5.5 L4 8 L8.5 1.5" stroke="#000" strokeWidth={1.6} fill="none" />
        </svg>
    );
}

export default async function PadPrint({ params }: { params: { id: string } }) {
    if (!(await getSession())) redirect("/login");
    const c = await db.caseHistory.findUnique({
        where: { id: Number(params.id) },
        include: {
            patient: true,
            prescriptions: { orderBy: { id: "asc" }, include: { items: { orderBy: { id: "asc" }, include: { medicine: true } } } },
            findings: { orderBy: { sortOrder: "asc" } },
        },
    });
    if (!c) return <p style={{ padding: 24 }}>Case not found.</p>;
    const items = c.prescriptions.flatMap((pr: any) => pr.items);
    // Diagnosis picked on the prescription page, one per line ("Dental caries (36)")
    const diagnosis = joinFindings("DIAGNOSIS", sectionItems(c, "DIAGNOSIS"));
    // tooth charts: the case's Adult / Child choice, else the patient's
    const child = (c.ageGroup || c.patient.ageGroup) === "CHILD";
    // doctor's signature, set on Security > Organization
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { signatureUrl: true } });
    const signature = org?.signatureUrl || null;

    return (
        <>
            {/* as raw HTML: a text child gets its quotes escaped differently on server and client */}
            <style dangerouslySetInnerHTML={{ __html: PAD_CSS }} />
            <PrintToolbar caseId={c.id} />
            <div className="pad relative mx-auto my-6 overflow-hidden bg-white shadow-lg" style={{ width: "210mm", height: "297mm" }}>
                <At x={POS.name.x} y={POS.name.y}>{c.patient.name}</At>
                {c.patient.gender === "MALE" && (
                    <At x={POS.sexM.x} y={POS.sexM.y}>
                        <Tick />
                    </At>
                )}
                {c.patient.gender === "FEMALE" && (
                    <At x={POS.sexF.x} y={POS.sexF.y}>
                        <Tick />
                    </At>
                )}
                {c.patient.age != null && <At x={POS.age.x} y={POS.age.y}>{String(c.patient.age)}</At>}
                <At x={POS.date.x} y={POS.date.y}>{fmt(new Date(c.caseDate))}</At>
                {c.problem && <At x={POS.cc.x} y={POS.cc.y} w={POS.cc.w}>{c.problem}</At>}
                <At x={POS.oe.x} y={POS.oe.y} w={POS.oe.w}>
                    {c.oe}
                    <PadTeeth text={c.toothNumber} child={child} dx={POS.oe.teethX - POS.oe.x} />
                </At>
                {c.bp && <At x={POS.bp.x} y={POS.bp.y}>{c.bp}</At>}
                {/* under the pad's "ADV:" label: the diagnosis, and the teeth picked under Advice */}
                <At x={POS.adv.x} y={POS.adv.y} w={POS.adv.w}>
                    {diagnosis}
                    <PadTeeth text={c.adviceTooth} child={child} dx={POS.adv.teethX - POS.adv.x} />
                </At>
                <At x={POS.rx.x} y={POS.rx.y} w={POS.rx.w}>
                    {items.map((m: any, i: number) => (
                        <RxLine key={m.id} no={i + 1} medicine={m.medicine} directions={directionsOf(m)} compact />
                    ))}
                    {/* advice, one per line, below the medicines */}
                    {c.details && <div style={{ marginTop: `${POS.rx.adviceGap}mm` }}>{c.details}</div>}
                </At>
                {signature && (
                    <div
                        className="absolute flex items-end justify-end"
                        style={{ left: `${POS.sign.x}mm`, top: `${POS.sign.y}mm`, width: `${POS.sign.w}mm`, height: `${POS.sign.h}mm` }}
                    >
                        {/* light paper behind a scanned signature turns white, only the ink prints */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={signature}
                            alt="Signature"
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "grayscale(1) contrast(3) brightness(1.15)", mixBlendMode: "multiply" }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
