import React from "react";
import { db } from "@/lib/prisma";
import { bad, requireSession } from "@/lib/api";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { buildBillCollections, paramsFrom } from "@/lib/reports/bill-collections";
import { ps, BORDER, ReportHeader, ReportFooter, orgInfo, pdfResponse, shortDate, dmy, amount } from "@/lib/reports/pdf-kit";

export const dynamic = "force-dynamic";

const W = { date: "12%", name: "28%", sc: "15%", col: "15%", disc: "13%", due: "17%" };

export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const p = paramsFrom(sp);
    const { items, totals } = await buildBillCollections(p);
    const org = await orgInfo();
    const patient: any = p.patientId ? await db.patient.findUnique({ where: { id: p.patientId } }) : null;

    const range = p.dateFrom || p.dateTo ? `[${shortDate(p.dateFrom) || "Beginning"} To ${shortDate(p.dateTo) || "Today"}]` : "[All Dates]";
    const sub = [
        patient ? `Patient: ${patient.name} (${patient.patientNo})` : "All Patients",
        p.runningOnly !== false ? "Running agreements only" : "All agreements",
    ].join("   |   ");

    const C = ({ w, children, right, bold }: any) => (
        <View style={[ps.cell, { width: w }]}>
            <Text style={[right ? ps.num : {}, bold ? ps.bold : {}]}>{children}</Text>
        </View>
    );

    const doc = (
        <Document title="Bill Collections">
            <Page size="A4" style={ps.page}>
                <View fixed>
                    <ReportHeader org={org} title={`Bill Collections ${range}`} sub={sub} />
                    <View style={[ps.row, { borderTop: BORDER, borderLeft: BORDER }]}>
                        <C w={W.date} bold>Collection Date</C>
                        <C w={W.name} bold>Patient Name</C>
                        <C w={W.sc} bold right>Total Service Charge</C>
                        <C w={W.col} bold right>Collected Amount</C>
                        <C w={W.disc} bold right>Discount</C>
                        <C w={W.due} bold right>Total Dues</C>
                    </View>
                </View>
                <View style={{ borderLeft: BORDER }}>
                    {items.map((r) => (
                        <View key={r.paymentId} style={ps.row} wrap={false}>
                            <C w={W.date}>{dmy(r.collectionDate)}</C>
                            <C w={W.name}>{`${r.patientName} (${r.patientNo})`}</C>
                            <C w={W.sc} right>{amount(r.totalServiceCharge)}</C>
                            <C w={W.col} right>{amount(r.collectedAmount)}</C>
                            <C w={W.disc} right>{amount(r.discount)}</C>
                            <C w={W.due} right>{amount(r.totalDues)}</C>
                        </View>
                    ))}
                    {items.length === 0 && <View style={ps.cell}><Text>No collections found for this filter.</Text></View>}
                    {items.length > 0 && (
                        <View style={ps.row} wrap={false}>
                            <View style={[ps.cell, { width: "55%" }]}><Text style={ps.bold}>Total</Text></View>
                            <C w={W.col} right bold>{amount(totals.collected)}</C>
                            <C w={W.disc} right bold>{amount(totals.discount)}</C>
                            <C w={W.due}> </C>
                        </View>
                    )}
                </View>
                <ReportFooter label={`Bill Collections ${range}`} />
            </Page>
        </Document>
    );
    return pdfResponse(doc, `bill-collections${p.dateTo ? "-" + p.dateTo : ""}.pdf`);
}
