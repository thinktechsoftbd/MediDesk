import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function GET() {
  { const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }
  return ok(await db.user.findMany({ select: { id: true, name: true, email: true, photoUrl: true, status: true, createdAt: true, roles: { include: { role: true } } }, orderBy: { name: "asc" } }));
}

export async function POST(req: Request) {
  { const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }
  const b = await parseBody(req);
  if (!b?.name || !b?.email || !b?.password) return bad("Name, email and password are required.");
  try {
    const user = await db.user.create({
      data: {
        name: b.name,
        email: b.email,
        photoUrl: b.photoUrl || null,
        status: b.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        passwordHash: await bcrypt.hash(b.password, 12),
        roles: b.roleId ? { create: { roleId: Number(b.roleId) } } : undefined,
      },
      select: { id: true, name: true, email: true, status: true },
    });
    return ok(user, 201);
  } catch (e: any) {
    if (e?.code === "P2002") return bad("This email is already used by another user.");
    return bad("Failed to create user.", 500);
  }
}
