import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

// Rename / reorder a picker term. Only the fields sent are changed.
// Cases keep the text they were saved with.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const row = await db.clinicalTerm.findUnique({ where: { id: Number(params.id) } });
    if (!row) return bad("Not found.", 404);
    const b = await parseBody(req);
    const data: any = {};
    if (b?.name !== undefined) {
        const name = String(b.name).trim().replace(/\s+/g, " ");
        if (!name) return bad("Name is required.");
        if (name.length > 200) return bad("Name can be at most 200 characters.");
        const clash = await db.clinicalTerm.findFirst({
            where: { category: row.category, id: { not: row.id }, name: { equals: name, mode: "insensitive" } },
        });
        if (clash) return bad("This name already exists.");
        data.name = name;
    }
    if (b?.sortOrder !== undefined) {
        const n = Number(b.sortOrder);
        if (!Number.isInteger(n)) return bad("Sort order must be a whole number.");
        data.sortOrder = n;
    }
    try {
        return ok(await db.clinicalTerm.update({ where: { id: row.id }, data }));
    } catch (e: any) {
        if (e?.code === "P2002") return bad("This name already exists.");
        return bad("Update failed.", 500);
    }
}

// Cases store the term as text, so deleting only removes the chip
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    try {
        await db.clinicalTerm.delete({ where: { id: Number(params.id) } });
        return ok({ deleted: true });
    } catch (e: any) {
        if (e?.code === "P2025") return bad("Not found.", 404);
        return bad("Delete failed.", 500);
    }
}
