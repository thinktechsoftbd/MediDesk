// "Sefril 500 mg (Capsule)"
export function medicineLabel(m: any) {
    if (!m) return "";
    return `${m.name}${m.strength ? ` ${m.strength}` : ""}${m.dosageForm ? ` (${m.dosageForm})` : ""}`;
}

const num = (v: any) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));

// fields a user can edit on the Medicines page
export function medicineData(b: any) {
  return {
    name: b.name.trim(),
    strength: b.strength?.trim() || null,
    dosageForm: b.dosageForm?.trim() || null,
    genericName: b.genericName?.trim() || null,
    company: b.company?.trim() || null,
    segment: b.segment?.trim() || null,
    priceAmount: num(b.priceAmount),
    url: b.url?.trim() || "",
    dosage: b.dosage?.trim() || null,
    duration: b.duration?.trim() || null,
    instructions: b.instructions?.trim() || null,
  };
}


// hand-added medicines get brand_id 900000001+, away from medex ids
export const MANUAL_ID_START = 900000000;

// directions as stored/compared: trimmed, empty -> ""
export const dir = (v: any) => String(v ?? "").trim();
