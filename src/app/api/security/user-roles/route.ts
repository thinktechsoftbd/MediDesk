import { denyUnless, getPermissionCodes, LOCKOUT_MSG } from "@/lib/permissions";

async function locksOut(me: number, roleIds: number[]) {
    const after = await getPermissionCodes(me, { roleIds });
    return !after.includes("SECURITY.M");
}
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

const include = {
    user: { select: { id: true, name: true, email: true, photoUrl: true, status: true } },
    role: { select: { id: true, name: true } },
};

export async function GET() {
    { const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }
    const rows = await db.userRole.findMany({ include });
    rows.sort((a: any, b: any) => a.user.name.localeCompare(b.user.name) || a.role.name.localeCompare(b.role.name));
    return ok(rows);
}

export async function POST(req: Request) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const b = await parseBody(req);
    const userId = Number(b?.userId), roleId = Number(b?.roleId);
    if (!userId || !roleId) return bad("User and role are required.");
    try {
        return ok(await db.userRole.create({ data: { userId, roleId }, include }), 201);
    } catch (e: any) {
        if (e?.code === "P2002") return bad("This user already has this role.");
        return bad("Failed to assign role.", 500);
    }
}

// change an existing assignment: { userId, roleId } -> { newUserId, newRoleId }
export async function PATCH(req: Request) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const b = await parseBody(req);
    const userId = Number(b?.userId), roleId = Number(b?.roleId);
    const newUserId = Number(b?.newUserId), newRoleId = Number(b?.newRoleId);
    if (!userId || !roleId || !newUserId || !newRoleId) return bad("User and role are required.");
    if (userId === newUserId && roleId === newRoleId) return ok({ ok: true });

    const me = Number(((await requireSession()) as any)?.user?.id);
    if (userId === me || newUserId === me) {
        const mine = (await db.userRole.findMany({ where: { userId: me }, select: { roleId: true } })).map((r: any) => r.roleId);
        let next = userId === me ? mine.filter((x: number) => x !== roleId) : mine;
        if (newUserId === me) next = Array.from(new Set([...next, newRoleId]));
        if (await locksOut(me, next)) return bad(LOCKOUT_MSG);
    }
    try {
        const row = await db.$transaction(async (tx: any) => {
            await tx.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
            return tx.userRole.create({ data: { userId: newUserId, roleId: newRoleId }, include });
        });
        return ok(row);
    } catch (e: any) {
        if (e?.code === "P2002") return bad("This user already has this role.");
        if (e?.code === "P2025") return bad("Assignment not found.", 404);
        return bad("Failed to update user role.", 500);
    }
}

export async function DELETE(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const sp = new URL(req.url).searchParams;
    const userId = Number(sp.get("userId")), roleId = Number(sp.get("roleId"));
    if (!userId || !roleId) return bad("User and role are required.");

    // don't let the signed-in user strip their own last role
    if (Number(session.user?.id) === userId) {
        const count = await db.userRole.count({ where: { userId } });
        if (count <= 1) return bad("You cannot remove your own only role while signed in.");
        const mine = (await db.userRole.findMany({ where: { userId }, select: { roleId: true } })).map((r: any) => r.roleId);
        if (await locksOut(userId, mine.filter((x: number) => x !== roleId))) return bad(LOCKOUT_MSG);
    }

    try {
        await db.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
        return ok({ ok: true });
    } catch (e: any) {
        if (e?.code === "P2025") return bad("Assignment not found.", 404);
        return bad("Failed to remove user role.", 500);
    }
}
