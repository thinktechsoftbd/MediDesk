import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { adviceInput } from "@/lib/patient-advice";

export const dynamic = "force-dynamic";

// { types: [{ id, name, description, isActive, count }], items: [{ id, typeId, typeName, title, advice, isActive, createdAt, updatedAt }] }
// ?q= searches type name, title and advice text; ?typeId= one type's advice. count = the type's advice, whatever the search.
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim() || "";
    const typeId = Number(sp.get("typeId")) || null;
    const like = `%${q}%`;
    try {
        const [types, items] = await Promise.all([
            db.$queryRaw`
                SELECT t.id::int AS id, t.name, t.description, t.is_active AS "isActive",
                       (SELECT count(*)::int FROM patient_advice a WHERE a.advice_type_id = t.id AND NOT a.is_deleted) AS count
                FROM patient_advice_type t
                WHERE NOT t.is_deleted
                ORDER BY t.id`,
            db.$queryRaw`
                SELECT a.id::int AS id, a.advice_type_id::int AS "typeId", t.name AS "typeName", a.title, a.advice,
                       a.is_active AS "isActive", a.created_at AS "createdAt", a.updated_at AS "updatedAt"
                FROM patient_advice a
                JOIN patient_advice_type t ON t.id = a.advice_type_id
                WHERE NOT a.is_deleted AND NOT t.is_deleted
                  AND (${typeId}::bigint IS NULL OR a.advice_type_id = ${typeId}::bigint)
                  AND (${q} = '' OR t.name ILIKE ${like} OR a.title ILIKE ${like} OR a.advice ILIKE ${like})
                ORDER BY t.id, a.id`,
        ]);
        return ok({ types, items });
    } catch {
        return bad("Could not load patient advice.", 500);
    }
}

// New advice: { typeId, title, advice, isActive }
export async function POST(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const v = adviceInput(await parseBody(req));
    if ("error" in v) return bad(v.error);
    const userId = Number(session.user?.id) || null;
    try {
        const rows: any[] = await db.$queryRaw`
            INSERT INTO patient_advice (advice_type_id, title, advice, is_active, created_by_id)
            SELECT t.id, ${v.title}, ${v.advice}, ${v.isActive}, ${userId}::bigint
            FROM patient_advice_type t
            WHERE t.id = ${v.typeId}::bigint AND NOT t.is_deleted
            RETURNING id::int AS id`;
        if (!rows.length) return bad("This advice type no longer exists.");
        return ok(rows[0], 201);
    } catch {
        return bad("Save failed.", 500);
    }
}
