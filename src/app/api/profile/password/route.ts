import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.currentPassword || !b?.newPassword) return bad("Current and new password are required.");
  if (String(b.newPassword).length < 6) return bad("New password must be at least 6 characters.");
  const me = await db.user.findUnique({ where: { id: Number((session.user as any).id) } });
  if (!me) return bad("User not found", 404);
  if (!(await bcrypt.compare(b.currentPassword, me.passwordHash))) return bad("Current password is incorrect.");
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(b.newPassword, 12) } });
  return ok({ changed: true });
}
