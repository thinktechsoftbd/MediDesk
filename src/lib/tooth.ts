// Tooth numbers are stored in CaseHistory.toothNumber as FDI codes:
// UR 11-18, UL 21-28, LL 31-38, LR 41-48 (e.g. "16, 26"). Other words are kept as-is.
export const TOOTH_CODE = /\b([1-4][1-8])\b/g;

export function selectedTeeth(text: string | null | undefined): Set<string> {
    return new Set(Array.from(String(text || "").matchAll(TOOTH_CODE)).map((m) => m[1]));
}

// words in the tooth text that are not tooth codes, e.g. "All tooth"
export function toothNote(text: string | null | undefined): string {
    return String(text || "")
        .replace(TOOTH_CODE, " ")
        .split(/[,;\s]+/)
        .filter(Boolean)
        .join(" ")
        .trim();
}
