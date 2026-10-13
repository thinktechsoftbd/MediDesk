import React from "react";
import { bad, requireSession } from "@/lib/api";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { buildBalanceSheet } from "@/lib/reports/balance-sheet";
import { ps, BORDER, ReportHeader, ReportFooter, orgInfo, pdfResponse, shortDate, amount } from "@/lib/reports/pdf-kit";

export const dynamic = "force-dynamic";

function Section({ title, rows, extra }: { title: string; rows: any[]; extra?: { name: string; amount: number } | null }) {
    const total = rows.reduce((s, x) => s + x.amount, 0) + (extra?.amount || 0);
    const Line = ({ name, value, bold, indent = 10 }: any) => (
        <View style={ps.row} wrap={false}>
            <View style={[ps.cell, { width: "72%" }]}>
                <Text style={[bold ? ps.bold : {}, { paddingLeft: indent }]}>{name}</Text>
            </View>
            <View style={[ps.cell, { width: "28%" }]}>
                <Text style={[ps.num, bold ? ps.bold : {}]}>{value}</Text>
            </View>
        </View>
    );
    return (
        <View style={{ borderLeft: BORDER, borderTop: BORDER, marginBottom: 10 }} wrap={false}>
            <Line name={title.toUpperCase()} value="" bold indent={0} />
            {rows.map((r) => (
                <Line key={r.code} name={`${r.code}  ${r.name}`} value={amount(r.amount)} />
            ))}
            {extra && <Line name={extra.name} value={amount(extra.amount)} />}
            {rows.length === 0 && !extra && <Line name="No balances" value="" />}
            <Line name={`Total ${title}`} value={amount(total)} bold indent={0} />
        </View>
    );
}

export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const asOf = sp.get("asOf")?.trim() || "";
    const data: any = await buildBalanceSheet({ asOf, postedOnly: sp.get("postedOnly") === "1" });
    const org = await orgInfo();
    const label = `Balance Sheet [As on ${shortDate(asOf) || "Today"}]`;
    const balanced = Math.abs(data.totals.assets - data.totals.liabilitiesEquity) < 0.005;

    const doc = (
        <Document title="Balance Sheet">
            <Page size="A4" style={ps.page}>
                <ReportHeader org={org} title={label} />

                <Section title="Assets" rows={data.assets} />
                <Section title="Liabilities" rows={data.liabilities} />
                <Section
                    title="Equity"
                    rows={data.equity}
                    extra={{ name: "Current Earnings (Income - Expense)", amount: data.currentEarnings }}
                />

                <View style={{ borderLeft: BORDER, borderTop: BORDER }} wrap={false}>
                    {[
                        ["Total Assets", data.totals.assets],
                        ["Total Liabilities & Equity", data.totals.liabilitiesEquity],
                    ].map(([n, v]: any) => (
                        <View key={n} style={ps.row}>
                            <View style={[ps.cell, { width: "72%" }]}><Text style={ps.bold}>{n}</Text></View>
                            <View style={[ps.cell, { width: "28%" }]}><Text style={[ps.num, ps.bold]}>{amount(v)}</Text></View>
                        </View>
                    ))}
                </View>
                <Text style={{ marginTop: 6, fontSize: 8, color: balanced ? "#0f5132" : "#b02a37" }}>
                    {balanced ? "Balanced" : `Difference: ${amount(data.totals.assets - data.totals.liabilitiesEquity)}`}
                </Text>

                <ReportFooter label={label} />
            </Page>
        </Document>
    );

    return pdfResponse(doc, `balance-sheet${asOf ? "-" + asOf : ""}.pdf`);
}
