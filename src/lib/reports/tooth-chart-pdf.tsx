import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { selectedTeeth } from "@/lib/tooth";

// Tooth chart for PDFs, same layout as the case form:
//   8 7 6 5 4 3 2 1 | 1 2 3 4 5 6 7 8   (upper right | upper left)
//   ----------------+----------------
//   8 7 6 5 4 3 2 1 | 1 2 3 4 5 6 7 8   (lower right | lower left)
// Selected teeth are bold with a circle, the rest are light grey.
const RIGHT = [8, 7, 6, 5, 4, 3, 2, 1];
const LEFT = [1, 2, 3, 4, 5, 6, 7, 8];

export function ToothChartPdf({ value, cell = 11, fontSize = 9 }: { value: string | null | undefined; cell?: number; fontSize?: number }) {
    const sel = selectedTeeth(value);
    const line = "#333";

    const Num = ({ code, n }: { code: string; n: number }) => {
        const on = sel.has(code);
        return (
            <View style={{ width: cell, paddingVertical: 1.5, alignItems: "center" }}>
                <Text
                    style={{
                        width: cell - 1,
                        paddingTop: Math.max(0, (cell - 1 - fontSize) / 2) + 0.6,
                        paddingBottom: Math.max(0, (cell - 1 - fontSize) / 2 - 0.6),
                        borderRadius: (cell - 1) / 2,
                        border: on ? "0.9 solid #000" : "0.9 solid #fff",
                        textAlign: "center",
                        fontSize,
                        lineHeight: 1,
                        fontFamily: on ? "Helvetica-Bold" : "Helvetica",
                        color: on ? "#000" : "#a3a3a3",
                    }}
                >
                    {String(n)}
                </Text>
            </View>
        );
    };

    const Half = ({ q, nums, side }: { q: number; nums: number[]; side: "r" | "l" }) => (
        <View style={{ flexDirection: "row", paddingHorizontal: 2, ...(side === "r" ? { borderRight: `1 solid ${line}` } : {}) }}>
            {nums.map((n) => <Num key={n} code={`${q}${n}`} n={n} />)}
        </View>
    );

    return (
        <View style={{ alignSelf: "flex-start" }}>
            <View style={{ flexDirection: "row", borderBottom: `1 solid ${line}` }}>
                <Half q={1} nums={RIGHT} side="r" />
                <Half q={2} nums={LEFT} side="l" />
            </View>
            <View style={{ flexDirection: "row" }}>
                <Half q={4} nums={RIGHT} side="r" />
                <Half q={3} nums={LEFT} side="l" />
            </View>
        </View>
    );
}
