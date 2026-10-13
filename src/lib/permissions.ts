import { db } from "./prisma";
import { requireSession } from "./api";

// Effective permission codes for a user: every permission from their roles
// plus any permission granted to the user directly.
//   override.roleId + override.permissionIds  -> pretend that role has these permissions
//   override.roleIds                          -> pretend the user holds exactly these roles
export async function getPermissionCodes(
    userId: number,
    override?: { roleId?: number; permissionIds?: number[]; roleIds?: number[] }
): Promise<string[]> {
    const roleIds =
        override?.roleIds ??
        (await db.userRole.findMany({ where: { userId }, select: { roleId: true } })).map((r: any) => r.roleId);

    const otherRoleIds = roleIds.filter((id: number) => id !== override?.roleId);

    const [fromRoles, direct, replaced] = await Promise.all([
        otherRoleIds.length
            ? db.rolePermission.findMany({ where: { roleId: { in: otherRoleIds } }, include: { permission: true } })
            : Promise.resolve([] as any[]),
        db.userPermission.findMany({ where: { userId }, include: { permission: true } }),
        override?.roleId && roleIds.includes(override.roleId)
            ? override.permissionIds
                ? db.permission.findMany({ where: { id: { in: override.permissionIds } } })
                : db.rolePermission
                      .findMany({ where: { roleId: override.roleId }, include: { permission: true } })
                      .then((rows: any[]) => rows.map((r) => r.permission))
            : Promise.resolve([] as any[]),
    ]);

    const codes = new Set<string>();
    fromRoles.forEach((r: any) => codes.add(r.permission.code));
    direct.forEach((r: any) => codes.add(r.permission.code));
    replaced.forEach((p: any) => codes.add(p.code));
    return Array.from(codes).sort();
}

// Session plus a permission check. Returns { session } or { error: status }.
export async function requirePermission(code: string) {
    const session: any = await requireSession();
    if (!session) return { error: 401 as const };
    const codes = await getPermissionCodes(Number(session.user?.id));
    if (!codes.includes(code)) return { error: 403 as const, session };
    return { session, codes };
}

export const LOCKOUT_MSG =
    "This change would remove your own Manage Security permission and lock you out of the Security menu. Give it to you through another role first, or make the change from another admin account.";

// For API routes: returns an error response, or null when allowed.
export async function denyUnless(code: string) {
    const { bad } = await import("./api");
    const r = await requirePermission(code);
    if (r.error === 401) return bad("Unauthorized", 401);
    if (r.error === 403) return bad("You do not have permission for this action.", 403);
    return null;
}
