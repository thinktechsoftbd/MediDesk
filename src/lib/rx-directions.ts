// Medicine directions as written on the Rx page:
//   rows: one dose schedule each ("+ Add more" adds a second one, e.g. a tapering dose)
//   note: free instruction / custom time
// Printed in Bangla:  ১ + ০ + ১   খাবারের পরে   ৭ দিন
// PrescriptionItem / Medicine keep the same as plain text in dosage / duration / instructions,
// so the case list and older screens keep working.

export type DurUnit = "day" | "week" | "month" | "continue" | "na";

export type DoseRow = {
    m: string; // সকাল
    n: string; // দুপুর
    a: string; // বিকাল
    e: string; // রাত
    unit: string; // "" | "চামচ" | "ফোঁটা" ...
    meal: string; // "" | "খাবারের পরে" ...
    dur: string; // number as typed
    durUnit: DurUnit;
};

export type Directions = { rows: DoseRow[]; note: string };

export const TIMES: { key: "m" | "n" | "a" | "e"; label: string }[] = [
    { key: "m", label: "সকাল" },
    { key: "n", label: "দুপুর" },
    { key: "a", label: "বিকাল" },
    { key: "e", label: "রাত" },
];

export const UNITS = ["", "টি", "চামচ", "ফোঁটা", "মি.লি.", "পাফ", "বার"];

export const MEALS = [
    "",
    "খাবারের পরে",
    "খাবারের আগে",
    "খাবারের ৩০ মিনিট আগে",
    "খাবারের ১ ঘণ্টা আগে",
    "খাবারের সাথে",
    "খালি পেটে",
    "ঘুমানোর আগে",
];

export const DUR_UNITS: { key: DurUnit; label: string }[] = [
    { key: "day", label: "দিন" },
    { key: "week", label: "সপ্তাহ" },
    { key: "month", label: "মাস" },
    { key: "continue", label: "চলবে" },
    { key: "na", label: "N/A" },
];

export const TAKE_FOR = [1, 3, 5, 7, 10, 14, 30];

const BN = "০১২৩৪৫৬৭৮৯";
export const toBn = (s: string) => String(s ?? "").replace(/[0-9]/g, (d) => BN[Number(d)]);
export const toEn = (s: string) => String(s ?? "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

// a dose slot counts when it is not blank and not zero ("0", "০", "0.0")
export const given = (q: string) => {
    const t = toEn(String(q ?? "")).trim();
    return !!t && !/^0*(\.0*)?$/.test(t);
};

export const emptyRow = (meal = "খাবারের পরে"): DoseRow => ({ m: "0", n: "0", a: "0", e: "0", unit: "", meal, dur: "", durUnit: "day" });
export const emptyDirections = (): Directions => ({ rows: [emptyRow()], note: "" });

const q = (v: string) => toBn(String(v ?? "").trim() || "0");

// "১ + ০ + ১", with বিকাল only when used: "১ + ০ + ১ + ১"
export function doseText(r: DoseRow) {
    if (![r.m, r.n, r.a, r.e].some(given)) return "";
    const parts = given(r.a) ? [r.m, r.n, r.a, r.e] : [r.m, r.n, r.e];
    return parts.map(q).join(" + ") + (r.unit ? ` ${r.unit}` : "");
}

export function durText(r: DoseRow) {
    if (r.durUnit === "na") return "";
    if (r.durUnit === "continue") return "চলবে";
    const n = String(r.dur ?? "").trim();
    if (!n) return "";
    return `${toBn(n)} ${DUR_UNITS.find((u) => u.key === r.durUnit)?.label || "দিন"}`;
}

// the three printed columns of a row, blanks removed
export const rowParts = (r: DoseRow) => ({ dose: doseText(r), meal: r.meal || "", dur: durText(r) });

export function cleanDirections(d: any): Directions | null {
    if (!d || !Array.isArray(d.rows)) return null;
    const rows: DoseRow[] = d.rows.slice(0, 6).map((r: any) => ({
        m: String(r?.m ?? "").slice(0, 6),
        n: String(r?.n ?? "").slice(0, 6),
        a: String(r?.a ?? "").slice(0, 6),
        e: String(r?.e ?? "").slice(0, 6),
        unit: String(r?.unit ?? "").slice(0, 20),
        meal: String(r?.meal ?? "").slice(0, 60),
        dur: String(r?.dur ?? "").slice(0, 6),
        durUnit: (DUR_UNITS.some((u) => u.key === r?.durUnit) ? r.durUnit : "day") as DurUnit,
    }));
    const note = String(d.note ?? "").trim().slice(0, 500);
    if (!rows.length && !note) return null;
    return { rows, note };
}

export const isEmptyDirections = (d: Directions | null) =>
    !d || (!d.note && d.rows.every((r) => !doseText(r) && !r.meal && !durText(r)));

// plain-text copy for prescription_item.dosage / duration / instructions
export function legacyText(d: Directions | null) {
    if (!d) return { dosage: "-", duration: "-", instructions: null as string | null };
    const doses = d.rows.map(doseText).filter(Boolean);
    const durs = d.rows.map(durText).filter(Boolean);
    const meals = Array.from(new Set(d.rows.map((r) => r.meal).filter(Boolean)));
    const instructions = [meals.join(", "), d.note].filter(Boolean).join(" · ");
    return { dosage: doses.join(" → ") || "-", duration: durs.join(" → ") || "-", instructions: instructions || null };
}

// Older lines and medicine defaults only have text ("1+0+1", "7 days", "after meal"):
// read what we can into a row, the rest goes to the note.
export function fromLegacy(dosage?: string | null, duration?: string | null, instructions?: string | null): Directions | null {
    const ds = String(dosage ?? "").trim();
    const du = String(duration ?? "").trim();
    const ins = String(instructions ?? "").trim();
    if ((!ds || ds === "-") && (!du || du === "-") && !ins) return null;

    const row: DoseRow = { m: "0", n: "0", a: "0", e: "0", unit: "", meal: "", dur: "", durUnit: "na" };
    const note: string[] = [];

    const parts = toEn(ds).split(/\s*\+\s*/).map((s) => s.trim());
    if (ds && ds !== "-" && (parts.length === 3 || parts.length === 4) && parts.every((p) => /^\d+(\.\d+)?$|^½$/.test(p))) {
        if (parts.length === 3) [row.m, row.n, row.e] = parts;
        else [row.m, row.n, row.a, row.e] = parts;
    } else if (ds && ds !== "-") note.push(ds);

    const dm = toEn(du).match(/^(\d+)\s*(day|days|d|দিন|week|weeks|সপ্তাহ|month|months|মাস)?$/i);
    if (dm) {
        row.dur = dm[1];
        const w = (dm[2] || "").toLowerCase();
        row.durUnit = /week|সপ্তাহ/.test(w) ? "week" : /month|মাস/.test(w) ? "month" : "day";
    } else if (/continue|চলবে/i.test(du)) row.durUnit = "continue";
    else if (du && du !== "-") note.push(du);

    const meal = MEALS.find((m) => m && ins.startsWith(m));
    if (meal) {
        row.meal = meal;
        const rest = ins.slice(meal.length).replace(/^[\s·,।-]+/, "");
        if (rest) note.push(rest);
    } else if (/after (a )?meal/i.test(ins)) {
        row.meal = "খাবারের পরে";
        const rest = ins.replace(/after (a )?meals?/i, "").replace(/^[\s·,.-]+|[\s·,.-]+$/g, "");
        if (rest) note.push(rest);
    } else if (/before (a )?meal/i.test(ins)) {
        row.meal = "খাবারের আগে";
        const rest = ins.replace(/before (a )?meals?/i, "").replace(/^[\s·,.-]+|[\s·,.-]+$/g, "");
        if (rest) note.push(rest);
    } else if (ins) note.push(ins);

    return { rows: [row], note: note.join(" · ") };
}

// [{ medicineId, directions }] as stored on an Rx template
export function templateItems(raw: any) {
    const list: any[] = Array.isArray(raw) ? raw : [];
    return list
        .filter((l) => Number(l?.medicineId))
        .slice(0, 50)
        .map((l) => ({ medicineId: Number(l.medicineId), directions: cleanDirections(l.directions) }));
}

// directions saved on an Rx line or a medicine, structured first, text as fallback
export const directionsOf = (x: any): Directions | null =>
    cleanDirections(x?.directions) || fromLegacy(x?.dosage, x?.duration, x?.instructions);

// "Cap." / "Tab." ... from the medex dosage form
export function formPrefix(form?: string | null) {
    const f = String(form ?? "").trim();
    if (!f) return "";
    if (/^tablet/i.test(f)) return "Tab.";
    if (/^capsule/i.test(f)) return "Cap.";
    if (/syrup/i.test(f)) return "Syp.";
    if (/suspension/i.test(f)) return "Susp.";
    if (/inject/i.test(f)) return "Inj.";
    if (/suppositor/i.test(f)) return "Supp.";
    if (/ointment/i.test(f)) return "Oint.";
    return f.replace(/\s*\(.*\)$/, "");
}
