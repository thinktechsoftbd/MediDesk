import { db } from "@/lib/prisma";
import { bad, requireSession } from "@/lib/api";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11 },
  title: { fontSize: 20, textAlign: "center" },
  sub: { fontSize: 9, color: "#64748b", textAlign: "center", marginBottom: 14 },
  rule: { borderBottom: "1 solid #0f766e", marginBottom: 12 },
  row2: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  section: { fontSize: 12, marginTop: 14, marginBottom: 4, color: "#0f766e" },
  body: { lineHeight: 1.4 },
  th: { flexDirection: "row", borderBottom: "1 solid #999", paddingVertical: 5, fontSize: 10, color: "#475569" },
  tr: { flexDirection: "row", borderBottom: "0.5 solid #ddd", paddingVertical: 6 },
  cMed: { flex: 3 }, cDose: { flex: 1.5 }, cDur: { flex: 1.5 }, cIns: { flex: 2.5 },
  sign: { marginTop: 50, flexDirection: "row", justifyContent: "flex-end" },
});

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

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
  const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
  const items = c.prescriptions.flatMap((pr: any) => pr.items);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{org?.nameEn || "Mohonto Dental Care"}</Text>
        <Text style={styles.sub}>
          {[org?.slogan, org?.addressLine1, org?.city, org?.phone].filter(Boolean).join(" · ") || "Dental Clinic"}
        </Text>
        <View style={styles.rule} />

        <View style={styles.row2}>
          <Text>Patient: {c.patient.name}   ({c.patient.patientNo})</Text>
          <Text>Date: {fmt(new Date(c.caseDate))}</Text>
        </View>
        <View style={styles.row2}>
          <Text>Phone: {c.patient.phone}{c.patient.age ? `   Age: ${c.patient.age}` : ""}{c.patient.gender ? `   ${c.patient.gender.charAt(0)}${c.patient.gender.slice(1).toLowerCase()}` : ""}</Text>
          <Text>Case: Case-{String(c.caseNo).padStart(2, "0")}{c.toothNumber ? `   Tooth: ${c.toothNumber}` : ""}{c.bp ? `   B/P: ${c.bp}` : ""}</Text>
        </View>

        <Text style={styles.section}>Problem / Diagnosis</Text>
        <Text style={styles.body}>{c.problem || "—"}</Text>

        <Text style={styles.section}>Treatment</Text>
        <Text style={styles.body}>{c.treatment || "—"}</Text>

        <Text style={styles.section}>Rx — Medicines</Text>
        {items.length === 0 ? (
          <Text style={styles.body}>—</Text>
        ) : (
          <View>
            <View style={styles.th}>
              <Text style={styles.cMed}>Medicine</Text>
              <Text style={styles.cDose}>Dosage</Text>
              <Text style={styles.cDur}>Duration</Text>
              <Text style={styles.cIns}>Instructions</Text>
            </View>
            {items.map((m: any, i: number) => (
              <View style={styles.tr} key={i}>
                <Text style={styles.cMed}>
                  {i + 1}. {m.medicine.name}
                  {m.medicine.strength ? ` ${m.medicine.strength} ${m.medicine.unit || ""}` : ""}
                  {m.medicine.dosageForm ? ` (${m.medicine.dosageForm})` : ""}
                </Text>
                <Text style={styles.cDose}>{m.dosage}</Text>
                <Text style={styles.cDur}>{m.duration}</Text>
                <Text style={styles.cIns}>{m.instructions || ""}</Text>
              </View>
            ))}
          </View>
        )}

        {c.details ? (
          <>
            <Text style={styles.section}>Remarks</Text>
            <Text style={styles.body}>{c.details}</Text>
          </>
        ) : null}

        <View style={styles.sign}>
          <Text>Doctor: ____________________________</Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new Response(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescription-${c.patient.patientNo}-case${c.caseNo}.pdf"`,
    },
  });
}
