import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET() {
    { const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }

    return ok(
        await db.role.findMany({
            include: {
                permissions: { include: { permission: true } },
                _count: { select: { users: true } },
            },
            orderBy: { name: "asc" },
        })
    );
}

export async function POST(req: Request) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }

    const b = await parseBody(req);
    const name = String(b?.name || "").trim();
    if (!name) return bad("Role name is required.");

    const ids: number[] = Array.isArray(b.permissionIds) ? b.permissionIds.map(Number) : [];

    try {
        const role = await db.role.create({
            data: {
                name,
                description: b.description || null,
                permissions: ids.length ? { create: ids.map((permissionId) => ({ permissionId })) } : undefined,
            },
        });
        return ok(role, 201);
    } catch (e: any) {
        if (e?.code === "P2002") return bad("A role with this name already exists.");
        return bad("Failed to create role.", 500);
    }
}
