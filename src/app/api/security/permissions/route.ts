import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET() {
    { const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }
    return ok(
        await db.permission.findMany({
            include: { _count: { select: { roles: true, userPermissions: true } } },
            orderBy: { code: "asc" },
        })
    );
}

export async function POST(req: Request) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
    const b = await parseBody(req);
    const code = String(b?.code || "").trim().toUpperCase();
    const name = String(b?.name || "").trim();
    if (!code || !name) return bad("Code and name are required.");
    try {
        return ok(await db.permission.create({ data: { code, name, description: b.description || null } }), 201);
    } catch (e: any) {
        if (e?.code === "P2002") return bad("A permission with this code already exists.");
        return bad("Failed to create permission.", 500);
    }
}
