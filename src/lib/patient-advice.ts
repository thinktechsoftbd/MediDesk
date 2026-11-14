// Settings > Patient Advice: tables patient_advice_type and patient_advice (see prisma/sql/patient_advice_seed.sql).
// They are not in schema.prisma: their BIGINT created_by_id / updated_by_id cannot be Prisma relations to the
// INT "User".id, and without those relations `prisma db push` would drop the foreign keys. So the API uses plain SQL.
// Delete = is_deleted true; deleted rows are never listed.

// New / Update advice: { typeId, title, advice, isActive }
export function adviceInput(b: any): { typeId: number; title: string; advice: string; isActive: boolean } | { error: string } {
    const typeId = Number(b?.typeId);
    const title = String(b?.title ?? "").trim().replace(/\s+/g, " ");
    // one advice per line: trailing spaces and blank lines at the start / end dropped
    const advice = String(b?.advice ?? "")
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((l) => l.trimEnd())
        .join("\n")
        .trim();
    if (!Number.isInteger(typeId) || typeId < 1) return { error: "Pick an advice type." };
    if (!title) return { error: "Title is required." };
    if (title.length > 200) return { error: "Title can be at most 200 characters." };
    if (!advice) return { error: "Advice is required." };
    return { typeId, title, advice, isActive: b?.isActive !== false };
}

// New / Update advice type: { name, description, isActive }
export function typeInput(b: any): { name: string; description: string | null; isActive: boolean } | { error: string } {
    const name = String(b?.name ?? "").trim().replace(/\s+/g, " ");
    const description = String(b?.description ?? "").trim() || null;
    if (!name) return { error: "Type name is required." };
    if (name.length > 150) return { error: "Type name can be at most 150 characters." };
    if (description && description.length > 500) return { error: "Description can be at most 500 characters." };
    return { name, description, isActive: b?.isActive !== false };
}

// GET /api/patient-advice -> the prescription page's Advice picker tabs: active types that have
// active advice, each advice line one pick (a line repeated within a type shows once)
export function adviceGroups(d: any): { id: string; name: string; terms: { id: string; name: string }[] }[] {
    const items = (d?.items || []).filter((i: any) => i.isActive);
    return (d?.types || [])
        .filter((t: any) => t.isActive)
        .map((t: any) => {
            const seen = new Set<string>();
            const terms: { id: string; name: string }[] = [];
            for (const i of items.filter((i: any) => i.typeId === t.id))
                String(i.advice)
                    .split("\n")
                    .forEach((line, n) => {
                        const name = line.trim();
                        if (!name || seen.has(name)) return;
                        seen.add(name);
                        terms.push({ id: `a${i.id}-${n}`, name });
                    });
            return { id: String(t.id), name: t.name, terms };
        })
        .filter((g: any) => g.terms.length);
}

// a unique-constraint error from a plain SQL query (Prisma P2010 wraps the Postgres code)
export const isUniqueViolation = (e: any) => e?.code === "P2002" || e?.meta?.code === "23505";
