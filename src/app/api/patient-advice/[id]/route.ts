import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { adviceInput } from "@/lib/patient-advice";

// Update advice: { typeId, title, advice, isActive }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const v = adviceInput(await parseBody(req));
    if ("error" in v) return bad(v.error);
    const userId = Number(session.user?.id) || null;
    try {
        const rows: any[] = await db.$queryRaw`
            UPDATE patient_advice a
            SET advice_type_id = t.id, title = ${v.title}, advice = ${v.advice}, is_active = ${v.isActive},
                updated_at = CURRENT_TIMESTAMP, updated_by_id = ${userId}::bigint
            FROM patient_advice_type t
            WHERE a.id = ${Number(params.id)}::bigint AND NOT a.is_deleted
              AND t.id = ${v.typeId}::bigint AND NOT t.is_deleted
            RETURNING a.id::int AS id`;
        if (!rows.length) return bad("Advice not found, or its type was deleted.", 404);
        return ok(rows[0]);
    } catch {
        return bad("Update failed.", 500);
    }
}

// Delete: the row is kept with is_deleted true
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const userId = Number(session.user?.id) || null;
    try {
        const n = await db.$executeRaw`
            UPDATE patient_advice
            SET is_deleted = true, updated_at = CURRENT_TIMESTAMP, updated_by_id = ${userId}::bigint
            WHERE id = ${Number(params.id)}::bigint AND NOT is_deleted`;
        if (!n) return bad("Not found.", 404);
        return ok({ deleted: true });
    } catch {
        return bad("Delete failed.", 500);
    }
}
