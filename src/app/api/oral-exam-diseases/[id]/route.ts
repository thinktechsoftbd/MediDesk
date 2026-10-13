import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

// Update name and/or remarks. Only the fields sent are changed.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const b = await parseBody(req);
    const data: any = { lastUpdatedBy: Number(session.user?.id) || null, lastUpdatedDate: new Date() };
    if (b?.diseaseName !== undefined) {
        const n = String(b.diseaseName).trim();
        if (!n) return bad("Disease name is required.");
        data.diseaseName = n.slice(0, 150);
    }
    if (b?.remarks !== undefined) data.remarks = String(b.remarks || "").trim().slice(0, 250) || null;
    try {
        return ok(await db.oralExamDisease.update({ where: { id: Number(params.id) }, data }));
    } catch (e: any) {
        if (e?.code === "P2002") return bad("This disease name already exists.");
        if (e?.code === "P2025") return bad("Not found.", 404);
        return bad("Update failed.", 500);
    }
}

// Blocked while case histories use this O/E finding
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const row: any = await db.oralExamDisease.findUnique({ where: { id: Number(params.id) } });
    if (!row) return bad("Not found.", 404);
    const used = await db.caseHistory.count({ where: { oe: { equals: row.diseaseName, mode: "insensitive" } } });
    if (used) return bad(`Cannot delete: ${used} case histor${used === 1 ? "y uses" : "ies use"} "${row.diseaseName}".`);
    await db.oralExamDisease.delete({ where: { id: row.id } });
    return ok({ deleted: true });
}
