// Tooth numbers are stored in CaseHistory.toothNumber as FDI codes, adult and child
// (src/lib/teeth.ts, e.g. "16, 26"). Other words are kept as-is. Used by the PDF prints.
import { TOOTH_CODE, selectedTeeth } from "./teeth";

export { TOOTH_CODE, selectedTeeth };

// words in the tooth text that are not tooth codes, e.g. "All tooth"
export function toothNote(text: string | null | undefined): string {
    return String(text || "")
        .replace(TOOTH_CODE, " ")
        .split(/[,;\s]+/)
        .filter(Boolean)
        .join(" ")
        .trim();
}
