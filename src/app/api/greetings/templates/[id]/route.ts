import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req); return ok(await db.greetingTemplate.update({ where: { id: Number(params.id) }, data: { name: b.name, subject: b.subject || null, body: b.body, channel: b.channel, isActive: b.isActive } }));
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) { if (!await requireSession()) return bad("Unauthorized", 401); await db.greetingTemplate.delete({ where: { id: Number(params.id) } }); return ok({ success: true }); }
