// Teeth in a case's tooth text (toothNumber / adviceTooth) as FDI codes, e.g. "16, 26":
//   adult UR 11-18, UL 21-28, LL 31-38, LR 41-48
//   child (primary teeth) UR 51-55, UL 61-65, LL 71-75, LR 81-85, A=1 .. E=5
// Shared by the tooth chart on screen and the pad print.

export const TOOTH_CODE = /\b([1-4][1-8]|[5-8][1-5])\b/g;

export function selectedTeeth(text: string | null | undefined): Set<string> {
    return new Set(Array.from(String(text || "").matchAll(TOOTH_CODE)).map((m) => m[1]));
}

// Chart layout, patient facing the doctor:
//   upper right 8..1 | 1..8 upper left    (child: E..A | A..E)
//   lower right 8..1 | 1..8 lower left
export type TeethLayout = {
    q: { ur: number; ul: number; lr: number; ll: number }; // FDI quadrant digits
    right: number[];
    left: number[];
    label: (n: number) => string;
};

export const ADULT_TEETH: TeethLayout = {
    q: { ur: 1, ul: 2, lr: 4, ll: 3 },
    right: [8, 7, 6, 5, 4, 3, 2, 1],
    left: [1, 2, 3, 4, 5, 6, 7, 8],
    label: (n) => String(n),
};

export const CHILD_TEETH: TeethLayout = {
    q: { ur: 5, ul: 6, lr: 8, ll: 7 },
    right: [5, 4, 3, 2, 1],
    left: [1, 2, 3, 4, 5],
    label: (n) => " ABCDE"[n],
};
