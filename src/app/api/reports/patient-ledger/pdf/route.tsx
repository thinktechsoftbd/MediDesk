import React from "react";
import { bad, requireSession } from "@/lib/api";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { buildLedger } from "@/lib/reports/ledger";
import { ps, BORDER, ReportHeader, ReportFooter, orgInfo, pdfResponse, shortDate, dmy, amount } from "@/lib/reports/pdf-kit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const data: any = await buildLedger(sp);
    if (!data) return bad("Select a patient or a ledger head.");

    const org = await orgInfo();
    const dateFrom = sp.get("dateFrom") || "";
    const dateTo = sp.get("dateTo") || "";
    const range = dateFrom || dateTo ? `[${shortDate(dateFrom) || "Beginning"} To ${shortDate(dateTo) || "Today"}]` : "[All Dates]";
    const showPatient = !data.patient;

    const subParts = [];
    if (data.patient) subParts.push(`Patient: ${data.patient.name} (${data.patient.patientNo})`);
    if (data.head) subParts.push(`Ledger Head: ${data.head}`);

    // columns
    const W = showPatient
        ? { date: "9%", vno: "10%", pat: "16%", head: "15%", narr: "20%", dr: "10%", cr: "10%", bal: "10%" }
        : { date: "10%", vno: "11%", pat: "0%", head: "19%", narr: "27%", dr: "11%", cr: "11%", bal: "11%" };

    let run = 0, tDr = 0, tCr = 0;
    const rows = data.rows.map((r: any) => {
        run += r.debit - r.credit; tDr += r.debit; tCr += r.credit;
        return { ...r, balance: run };
    });

    const C = ({ w, children, right, bold }: any) => (
        <View style={[ps.cell, { width: w }]}>
            <Text style={[right ? ps.num : {}, bold ? ps.bold : {}]}>{children}</Text>
        </View>
    );

    const doc = (
        <Document title="Subsidiary Ledger">
            <Page size="A4" style={ps.page}>
                <View fixed>
                    <ReportHeader org={org} title={`Subsidiary Ledger ${range}`} sub={subParts.join("   |   ")} />
                    <View style={[ps.row, { borderTop: BORDER, borderLeft: BORDER }]}>
                        <C w={W.date} bold>Date</C>
                        <C w={W.vno} bold>Voucher</C>
                        {showPatient && <C w={W.pat} bold>Patient</C>}
                        <C w={W.head} bold>Ledger Head</C>
                        <C w={W.narr} bold>Narration</C>
                        <C w={W.dr} bold right>Debit</C>
                        <C w={W.cr} bold right>Credit</C>
                        <C w={W.bal} bold right>Balance</C>
                    </View>
                </View>

                <View style={{ borderLeft: BORDER }}>
                    {rows.map((r: any, i: number) => (
                        <View key={i} style={ps.row} wrap={false}>
                            <C w={W.date}>{dmy(r.date)}</C>
                            <C w={W.vno}>{r.voucherNo}{r.isPosted !== "Y" ? " *" : ""}</C>
                            {showPatient && <C w={W.pat}>{r.patient || "-"}</C>}
                            <C w={W.head}>{r.account}</C>
                            <C w={W.narr}>{r.narration}</C>
                            <C w={W.dr} right>{r.debit ? amount(r.debit) : ""}</C>
                            <C w={W.cr} right>{r.credit ? amount(r.credit) : ""}</C>
                            <C w={W.bal} right>{amount(r.balance)}</C>
                        </View>
                    ))}
                    {rows.length === 0 && (
                        <View style={ps.cell}><Text>No entries found for this filter.</Text></View>
                    )}
                    {rows.length > 0 && (
                        <View style={ps.row} wrap={false}>
                            <View style={[ps.cell, { width: showPatient ? "70%" : "67%" }]}><Text style={ps.bold}>Total</Text></View>
                            <C w={W.dr} right bold>{amount(tDr)}</C>
                            <C w={W.cr} right bold>{amount(tCr)}</C>
                            <C w={W.bal} right bold>{amount(tDr - tCr)}</C>
                        </View>
                    )}
                </View>

                {rows.some((r: any) => r.isPosted !== "Y") && (
                    <Text style={{ marginTop: 6, fontSize: 7, color: "#555" }}>* Unposted (draft) voucher</Text>
                )}

                <ReportFooter label={`Subsidiary Ledger ${range}`} />
            </Page>
        </Document>
    );

    return pdfResponse(doc, `subsidiary-ledger${dateTo ? "-" + dateTo : ""}.pdf`);
}
