import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const b = await parseBody(req);
    const code = String(b?.code || "").trim().toUpperCase();
    const name = String(b?.name || "").trim();
    if (!code || !name) return bad("Code and name are required.");
    try {
        return ok(
            await db.permission.update({
                where: { id: Number(params.id) },
                data: { code, name, description: b.description || null },
            })
        );
    } catch (e: any) {
        if (e?.code === "P2002") return bad("A permission with this code already exists.");
        if (e?.code === "P2025") return bad("Permission not found.", 404);
        return bad("Failed to update permission.", 500);
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const id = Number(params.id);
    const [roles, users] = await Promise.all([
        db.rolePermission.count({ where: { permissionId: id } }),
        db.userPermission.count({ where: { permissionId: id } }),
    ]);
    if (roles || users) {
        const parts = [];
        if (roles) parts.push(`${roles} role${roles > 1 ? "s" : ""}`);
        if (users) parts.push(`${users} user${users > 1 ? "s" : ""}`);
        return bad(`This permission is used by ${parts.join(" and ")}. Remove it from them first.`);
    }
    try {
        await db.permission.delete({ where: { id } });
        return ok({ ok: true });
    } catch (e: any) {
        if (e?.code === "P2025") return bad("Permission not found.", 404);
        return bad("Failed to delete permission.", 500);
    }
}
