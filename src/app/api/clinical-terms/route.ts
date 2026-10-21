import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { isCategory } from "@/lib/clinical-findings";

export const dynamic = "force-dynamic";

// Chip lists of the prescription page pickers: [{ id, category, name, sortOrder, remarks? }].
// ?category= one list, ?q= searches names. On Examination (OE) rows are the O/E master.
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const category = sp.get("category") || "";
    const q = sp.get("q")?.trim() || "";
    if (category && !isCategory(category)) return bad("Unknown category.");

    const terms =
        category === "OE"
            ? []
            : await db.clinicalTerm.findMany({
                  where: { ...(category ? { category } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
                  orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
              });
    const oe =
        !category || category === "OE"
            ? await db.oralExamDisease.findMany({
                  where: q ? { diseaseName: { contains: q, mode: "insensitive" } } : {},
                  orderBy: { diseaseName: "asc" },
              })
            : [];
    return ok([
        ...terms.map((t: any) => ({ id: t.id, category: t.category, name: t.name, sortOrder: t.sortOrder, createdAt: t.createdAt, updatedAt: t.updatedAt })),
        ...oe.map((o: any) => ({ id: o.id, category: "OE", name: o.diseaseName, remarks: o.remarks, sortOrder: 0 })),
    ]);
}

// New term: { category, name, sortOrder? }. An existing name (any case) is returned as is,
// so the picker can add a typed term without checking first.
export async function POST(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const b = await parseBody(req);
    const category = String(b?.category || "");
    const name = String(b?.name || "").trim().replace(/\s+/g, " ");
    if (!isCategory(category)) return bad("Unknown category.");
    if (!name) return bad("Name is required.");
    const userId = Number(session.user?.id) || null;

    if (category === "OE") {
        if (name.length > 150) return bad("Name can be at most 150 characters.");
        const found = await db.oralExamDisease.findFirst({ where: { diseaseName: { equals: name, mode: "insensitive" } } });
        if (found) return ok({ id: found.id, category, name: found.diseaseName, remarks: found.remarks, existed: true });
        // id has no default in the table: next number, retry if two saves race (as /api/oral-exam-diseases)
        for (let attempt = 0; attempt < 3; attempt++) {
            const max = await db.oralExamDisease.aggregate({ _max: { id: true } });
            try {
                const row = await db.oralExamDisease.create({ data: { id: Number(max._max.id || 0) + 1, diseaseName: name, createdBy: userId } });
                return ok({ id: row.id, category, name: row.diseaseName, remarks: null }, 201);
            } catch (e: any) {
                if (e?.code !== "P2002") return bad("Save failed.", 500);
            }
        }
        return bad("Could not assign an id, try again.", 500);
    }

    if (name.length > 200) return bad("Name can be at most 200 characters.");
    const found = await db.clinicalTerm.findFirst({ where: { category, name: { equals: name, mode: "insensitive" } } });
    if (found) return ok({ ...found, existed: true });
    let sortOrder = Number(b?.sortOrder);
    if (!Number.isInteger(sortOrder)) {
        // after the last one
        const max = await db.clinicalTerm.aggregate({ where: { category }, _max: { sortOrder: true } });
        sortOrder = Number(max._max.sortOrder || 0) + 10;
    }
    try {
        return ok(await db.clinicalTerm.create({ data: { category, name, sortOrder, createdBy: userId } }), 201);
    } catch (e: any) {
        if (e?.code === "P2002") return bad("This name already exists.");
        return bad("Save failed.", 500);
    }
}
