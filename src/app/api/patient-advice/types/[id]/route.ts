import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { isUniqueViolation, typeInput } from "@/lib/patient-advice";

// Update advice type: { name, description, isActive }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const v = typeInput(await parseBody(req));
    if ("error" in v) return bad(v.error);
    const id = Number(params.id);
    const userId = Number(session.user?.id) || null;
    try {
        const clash: any[] = await db.$queryRaw`
            SELECT 1 FROM patient_advice_type WHERE lower(name) = lower(${v.name}) AND id <> ${id}::bigint AND NOT is_deleted`;
        if (clash.length) return bad("This type already exists.");
        const rows: any[] = await db.$queryRaw`
            UPDATE patient_advice_type
            SET name = ${v.name}, description = ${v.description}, is_active = ${v.isActive},
                updated_at = CURRENT_TIMESTAMP, updated_by_id = ${userId}::bigint
            WHERE id = ${id}::bigint AND NOT is_deleted
            RETURNING id::int AS id`;
        if (!rows.length) return bad("Not found.", 404);
        return ok(rows[0]);
    } catch (e: any) {
        // a deleted type can still hold the name
        if (isUniqueViolation(e)) return bad("This name is already used by a deleted type.");
        return bad("Update failed.", 500);
    }
}

// Delete (is_deleted true), only once the type has no advice left
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const id = Number(params.id);
    const userId = Number(session.user?.id) || null;
    try {
        const used: any[] = await db.$queryRaw`
            SELECT count(*)::int AS n FROM patient_advice WHERE advice_type_id = ${id}::bigint AND NOT is_deleted`;
        if (used[0]?.n) return bad(`Delete this type's ${used[0].n} advice first.`);
        const n = await db.$executeRaw`
            UPDATE patient_advice_type
            SET is_deleted = true, updated_at = CURRENT_TIMESTAMP, updated_by_id = ${userId}::bigint
            WHERE id = ${id}::bigint AND NOT is_deleted`;
        if (!n) return bad("Not found.", 404);
        return ok({ deleted: true });
    } catch {
        return bad("Delete failed.", 500);
    }
}
