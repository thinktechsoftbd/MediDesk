import React from "react";
import { db } from "@/lib/prisma";
import { bad, requireSession } from "@/lib/api";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { buildTrialBalance, fmtAmt, fmtShort, TbNode } from "@/lib/reports/trial-balance";

export const dynamic = "force-dynamic";

const W = { part: "36%", open: "17%", dr: "15%", cr: "15%", close: "17%" };
const B = "0.6pt solid #333";

const s = StyleSheet.create({
    page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 28, fontSize: 8, fontFamily: "Helvetica" },
    topRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
    org: { fontSize: 16, textAlign: "center", marginTop: -6 },
    addr: { fontSize: 10, textAlign: "center", marginTop: 2 },
    title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 4, marginBottom: 10 },
    table: { borderTop: B, borderLeft: B },
    row: { flexDirection: "row" },
    cell: { borderRight: B, borderBottom: B, paddingVertical: 3, paddingHorizontal: 4 },
    th: { fontFamily: "Helvetica-Bold" },
    num: { textAlign: "right" },
    footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#555" },
});

const bold = (lvl: number) => (lvl <= 2 ? "Helvetica-Bold" : "Helvetica");
const indent = (lvl: number) => (lvl < 0 ? 0 : lvl * 8);

function Line({ n }: { n: TbNode }) {
    const f = { fontFamily: bold(n.level) };
    const noRowLines = n.level >= 0; // light grid like the sample: only column lines
    return (
        <View style={s.row} wrap={false}>
            <View style={[s.cell, { width: W.part, borderBottom: noRowLines ? "0" : B }]}>
                <Text style={[f, { paddingLeft: indent(n.level) }]}>{n.name}</Text>
            </View>
            {[n.opening, n.debit, n.credit, n.closing].map((v, i) => (
                <View key={i} style={[s.cell, { width: [W.open, W.dr, W.cr, W.close][i], borderBottom: noRowLines ? "0" : B }]}>
                    <Text style={[s.num, f]}>{fmtAmt(v)}</Text>
                </View>
            ))}
        </View>
    );
}

const flatten = (nodes: TbNode[], out: TbNode[] = []) => {
    for (const n of nodes) { out.push(n); flatten(n.children, out); }
    return out;
};

export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const dateFrom = sp.get("dateFrom")?.trim() || "";
    const dateTo = sp.get("dateTo")?.trim() || "";

    const { roots, total } = await buildTrialBalance({
        dateFrom, dateTo,
        postedOnly: sp.get("postedOnly") === "1",
        showPatients: sp.get("showPatients") === "1",
        showZero: sp.get("showZero") === "1",
    });

    const org: any = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    const address = [org?.addressLine1, org?.addressLine2, org?.city].filter(Boolean).join(", ");
    const now = new Date();
    const p2 = (n: number) => String(n).padStart(2, "0");
    const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const h = now.getHours();
    const printed = `${p2(now.getDate())}/${MON[now.getMonth()]}/${now.getFullYear()} ${p2(h % 12 || 12)}:${p2(now.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
    const range = dateFrom || dateTo ? `[${fmtShort(dateFrom) || "Beginning"} To ${fmtShort(dateTo) || "Today"}]` : "[All Dates]";

    const rows = flatten(roots);

    const doc = (
        <Document title="Trial Balance">
            <Page size="A4" style={s.page}>
                <View fixed>
                    <View style={s.topRow}>
                        <Text>Dental Care</Text>
                        <Text>Print Date: {printed}</Text>
                    </View>
                    <Text style={s.org}>{org?.nameEn || "Dental Care"}</Text>
                    {address ? <Text style={s.addr}>{address}</Text> : null}
                    <Text style={s.title}>Trial Balance {range}</Text>

                    {/* two-row header: Transactions spans Debit / Credit */}
                    <View style={[s.table, s.row]}>
                        <View style={[s.cell, { width: W.part }]}><Text style={s.th}>Particulars</Text></View>
                        <View style={[s.cell, { width: W.open }]}><Text style={[s.th, { textAlign: "center" }]}>Opening Balance</Text></View>
                        <View style={{ width: "30%" }}>
                            <View style={[s.cell]}><Text style={[s.th, { textAlign: "center" }]}>Transactions</Text></View>
                            <View style={s.row}>
                                <View style={[s.cell, { width: "50%" }]}><Text style={[s.th, s.num]}>Debit</Text></View>
                                <View style={[s.cell, { width: "50%" }]}><Text style={[s.th, s.num]}>Credit</Text></View>
                            </View>
                        </View>
                        <View style={[s.cell, { width: W.close }]}><Text style={[s.th, { textAlign: "center" }]}>Closing Balance</Text></View>
                    </View>
                </View>

                <View style={{ borderLeft: B }}>
                    {rows.map((n) => <Line key={n.key} n={n} />)}
                    {rows.length === 0 && (
                        <View style={[s.cell, { borderBottom: B }]}><Text>No voucher entries for this period.</Text></View>
                    )}
                </View>

                <View style={{ borderLeft: B, borderTop: B }} wrap={false}>
                    <Line n={{ ...total, level: -1 }} />
                </View>

                <View style={s.footer} fixed>
                    <Text>Trial Balance {range}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );

    const buffer = await renderToBuffer(doc);
    return new Response(buffer as any, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="trial-balance${dateTo ? "-" + dateTo : ""}.pdf"`,
        },
    });
}
