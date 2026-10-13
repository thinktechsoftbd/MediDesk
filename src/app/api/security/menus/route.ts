import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import {
    bad,
    ok,
    parseBody,
    requireSession,
} from "@/lib/api";

export async function GET() {
    { const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }

    return ok(
        await db.menu.findMany({
            include: {
                children: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
        })
    );
}

export async function POST(req: Request) {
    { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }

    const b = await parseBody(req);

    return ok(
        await db.menu.create({
            data: {
                title: b.title,
                path: b.path,
                icon: b.icon || null,
                sortOrder: Number(b.sortOrder || 0),
                parentId: b.parentId
                    ? Number(b.parentId)
                    : null,
                roleId: b.roleId
                    ? Number(b.roleId)
                    : null,
            },
        }),
        201
    );
}