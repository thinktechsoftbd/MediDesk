import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET() {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const me = await db.user.findUnique({
    where: { id: Number((session.user as any).id) },
    select: { id: true, name: true, email: true, photoUrl: true, roles: { include: { role: true } } },
  });
  return me ? ok(me) : bad("User not found", 404);
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.name?.trim()) return bad("Name is required.");
  if (b.photoUrl && String(b.photoUrl).length > 700000) return bad("Photo is too large. Use an image under 500 KB.");
  const me = await db.user.update({
    where: { id: Number((session.user as any).id) },
    data: { name: b.name.trim(), photoUrl: b.photoUrl === undefined ? undefined : b.photoUrl || null },
    select: { id: true, name: true, email: true, photoUrl: true },
  });
  return ok(me);
}
