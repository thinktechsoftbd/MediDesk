import { db } from "@/lib/prisma";
import { bad, requireSession } from "@/lib/api";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";

// ============================================================
// PAD MODE: prints ONLY the values onto the pre-printed A4 pad.
// All positions are in millimetres from the TOP-LEFT of the page.
// Print a test page, measure how far each value is off, and
// adjust the numbers below (bigger y = lower, bigger x = right).
// ============================================================
const POS = {
  name:    { x: 22,  y: 42.5 },   // after "Name:"
  sexM:    { x: 115.5, y: 41.5 },   // tick over the M box
  sexF:    { x: 124, y: 41.5 },   // tick over the F box
  age:     { x: 147, y: 42.2 },   // after "Age:"
  date:    { x: 172, y: 42.2 },   // after "Date:"
  cc:      { x: 16,  y: 60, w: 58 },  // C/C block (problem)
  oe:      { x: 16,  y: 87, w: 58 },  // O/E block
  bp:      { x: 13,  y: 140 },  // after "B/P:"
  adv:     { x: 6,   y: 205, w: 60 }, // ADV: block (remarks)
  rx:      { x: 82,  y: 58, w: 115 }, // Rx column (medicines)
};

const mm = (v: number) => v * 2.8346; // mm -> pt

const styles = StyleSheet.create({
  page: { fontSize: 11 },
  abs: { position: "absolute" },
  med: { marginBottom: 7 },
  medName: { fontSize: 11 },
  medDetail: { fontSize: 9, color: "#222", marginTop: 1.5 },
});

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function Tick() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      <Path d="M1.5 5.5 L4 8 L8.5 1.5" stroke="#000" strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function At({ x, y, w, children }: { x: number; y: number; w?: number; children: React.ReactNode }) {
  return (
    <View style={[styles.abs, { left: mm(x), top: mm(y), ...(w ? { width: mm(w) } : {}) }]}>
      {children}
    </View>
  );
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const c = await db.caseHistory.findUnique({
    where: { id: Number(params.id) },
    include: {
      patient: true,
      prescriptions: { include: { items: { include: { medicine: true } } }, orderBy: { id: "asc" } },
    },
  });
  if (!c) return bad("Case not found", 404);
  const items = c.prescriptions.flatMap((pr: any) => pr.items);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <At x={POS.name.x} y={POS.name.y}>
          <Text>{c.patient.name}</Text>
        </At>

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

        {c.patient.age != null && (
          <At x={POS.age.x} y={POS.age.y}>
            <Text>{String(c.patient.age)}</Text>
          </At>
        )}

        <At x={POS.date.x} y={POS.date.y}>
          <Text>{fmt(new Date(c.caseDate))}</Text>
        </At>

        {c.problem ? (
          <At x={POS.cc.x} y={POS.cc.y} w={POS.cc.w}>
            <Text>{c.problem}</Text>
          </At>
        ) : null}

        {c.oe ? (
          <At x={POS.oe.x} y={POS.oe.y} w={POS.oe.w}>
            <Text>{c.oe}</Text>
          </At>
        ) : null}

        {c.bp ? (
          <At x={POS.bp.x} y={POS.bp.y}>
            <Text>{c.bp}</Text>
          </At>
        ) : null}

        {c.details ? (
          <At x={POS.adv.x} y={POS.adv.y} w={POS.adv.w}>
            <Text>{c.details}</Text>
          </At>
        ) : null}

        <At x={POS.rx.x} y={POS.rx.y} w={POS.rx.w}>
          {items.map((m: any, i: number) => (
            <View style={styles.med} key={i}>
              <Text style={styles.medName}>
                {i + 1}. {m.medicine.name}
                {m.medicine.strength ? ` ${m.medicine.strength} ${m.medicine.unit || ""}` : ""}
                {m.medicine.dosageForm ? ` (${m.medicine.dosageForm})` : ""}
              </Text>
              <Text style={styles.medDetail}>
                {[m.dosage, m.duration, m.instructions].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
          ))}
        </At>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new Response(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pad-${c.patient.patientNo}-case${c.caseNo}.pdf"`,
    },
  });
}
