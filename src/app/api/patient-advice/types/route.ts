import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { isUniqueViolation, typeInput } from "@/lib/patient-advice";

// New advice type: { name, description, isActive }. A deleted type of the same name comes back
// (the name is unique in the table, deleted rows included).
export async function POST(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const v = typeInput(await parseBody(req));
    if ("error" in v) return bad(v.error);
    const userId = Number(session.user?.id) || null;
    try {
        const clash: any[] = await db.$queryRaw`
            SELECT 1 FROM patient_advice_type WHERE lower(name) = lower(${v.name}) AND NOT is_deleted`;
        if (clash.length) return bad("This type already exists.");
        const rows: any[] = await db.$queryRaw`
            INSERT INTO patient_advice_type (name, description, is_active, created_by_id)
            VALUES (${v.name}, ${v.description}, ${v.isActive}, ${userId}::bigint)
            ON CONFLICT (name) DO UPDATE
            SET is_deleted = false, description = EXCLUDED.description, is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP, updated_by_id = EXCLUDED.created_by_id
            WHERE patient_advice_type.is_deleted
            RETURNING id::int AS id`;
        if (!rows.length) return bad("This type already exists.");
        return ok(rows[0], 201);
    } catch (e: any) {
        if (isUniqueViolation(e)) return bad("This type already exists.");
        return bad("Save failed.", 500);
    }
}
