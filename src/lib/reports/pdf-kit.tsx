import React from "react";
import { db } from "@/lib/prisma";
import { Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// Shared pieces for A4 report PDFs: org header, print date, page footer.
export const BORDER = "0.6pt solid #333";

export const ps = StyleSheet.create({
    page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 28, fontSize: 8, fontFamily: "Helvetica" },
    topRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
    org: { fontSize: 16, textAlign: "center", marginTop: -6 },
    addr: { fontSize: 10, textAlign: "center", marginTop: 2 },
    title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 4, marginBottom: 8 },
    sub: { fontSize: 9, textAlign: "center", marginTop: -4, marginBottom: 8 },
    row: { flexDirection: "row" },
    cell: { borderRight: BORDER, borderBottom: BORDER, paddingVertical: 3, paddingHorizontal: 4 },
    th: { fontFamily: "Helvetica-Bold" },
    num: { textAlign: "right" },
    bold: { fontFamily: "Helvetica-Bold" },
    footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#555" },
});

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

export const shortDate = (ymd?: string | Date | null) => {
    if (!ymd) return "";
    const s = typeof ymd === "string" ? ymd : ymd.toISOString();
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${MON[Number(m) - 1]}/${y.slice(2)}`;
};

export const dmy = (v?: string | Date | null) => {
    if (!v) return "";
    const s = typeof v === "string" ? v : v.toISOString();
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

export const amount = (n: number) => {
    const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < -0.004 ? `(${s})` : s;
};

export async function orgInfo() {
    const org: any = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    return {
        name: org?.nameEn || "Dental Care",
        address: [org?.addressLine1, org?.addressLine2, org?.city].filter(Boolean).join(", "),
    };
}

export function printStamp() {
    const now = new Date();
    const h = now.getHours();
    return `${p2(now.getDate())}/${MON[now.getMonth()]}/${now.getFullYear()} ${p2(h % 12 || 12)}:${p2(now.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

export function ReportHeader({ org, title, sub }: { org: { name: string; address: string }; title: string; sub?: string }) {
    return (
        <View>
            <View style={ps.topRow}>
                <Text>Dental Care</Text>
                <Text>Print Date: {printStamp()}</Text>
            </View>
            <Text style={ps.org}>{org.name}</Text>
            {org.address ? <Text style={ps.addr}>{org.address}</Text> : null}
            <Text style={ps.title}>{title}</Text>
            {sub ? <Text style={ps.sub}>{sub}</Text> : null}
        </View>
    );
}

export function ReportFooter({ label }: { label: string }) {
    return (
        <View style={ps.footer} fixed>
            <Text>{label}</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
    );
}

export async function pdfResponse(doc: React.ReactElement, filename: string) {
    const buffer = await renderToBuffer(doc as any);
    return new Response(buffer as any, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"` },
    });
}
