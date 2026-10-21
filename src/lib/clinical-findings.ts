// Clinical sections of the prescription page. Each is picked from a chip list
// (clinical_term, or oral_exam_disease for On Examination) and saved per case in
// case_finding. Sections with a `field` also keep the items in that case_history column
// ("Caries (21)", one per line; O/E comma separated, as the case form edits it on one line),
// so the case list, the case page and the pad print work.

export type FindingCategory = "COMPLAINT" | "OE" | "INVESTIGATION" | "DIAGNOSIS" | "TREATMENT" | "ADVICE";
export type CaseField = "problem" | "oe" | "treatment" | "details";
export type FindingItem = { term: string; note: string };

export const SECTIONS: { key: FindingCategory; title: string; field?: CaseField; sep?: string }[] = [
    { key: "COMPLAINT", title: "Patient Complaints", field: "problem" },
    { key: "OE", title: "On Examination", field: "oe", sep: ", " },
    { key: "INVESTIGATION", title: "Investigations" },
    { key: "DIAGNOSIS", title: "Diagnosis" },
    { key: "TREATMENT", title: "Treatment Plan", field: "treatment" },
    { key: "ADVICE", title: "Advice", field: "details" },
];

// kept in clinical_term (On Examination lives in oral_exam_disease)
export const TERM_CATEGORIES = SECTIONS.filter((s) => s.key !== "OE");

export const isCategory = (v: unknown): v is FindingCategory => SECTIONS.some((s) => s.key === v);

const sepOf = (key: FindingCategory) => SECTIONS.find((s) => s.key === key)?.sep || "\n";
export const findingLine = (i: FindingItem) => (i.note.trim() ? `${i.term} (${i.note.trim()})` : i.term);
// a section's items as the text kept in its case_history column
export const joinFindings = (key: FindingCategory, items: FindingItem[]) => items.map(findingLine).join(sepOf(key));

// The items of a section for a case: its case_finding rows while the case_history column
// still matches them, otherwise that column's text split up (older cases, or text edited on the case form).
export function sectionItems(c: any, key: FindingCategory): FindingItem[] {
    const rows: FindingItem[] = (c?.findings || [])
        .filter((f: any) => f.category === key)
        .map((f: any) => ({ term: f.term, note: f.note || "" }));
    const field = SECTIONS.find((s) => s.key === key)?.field;
    if (!field) return rows;
    const text = String(c?.[field] || "").trim();
    if (rows.length && joinFindings(key, rows) === text) return rows;
    return text
        .split(sepOf(key) === "\n" ? /\r?\n/ : /\r?\n|, /)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((term) => ({ term, note: "" }));
}

export function itemsByCategory(c: any) {
    return Object.fromEntries(SECTIONS.map((s) => [s.key, sectionItems(c, s.key)])) as Record<FindingCategory, FindingItem[]>;
}
