import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET() { if (!await requireSession()) return bad("Unauthorized", 401); return ok(await db.greetingTemplate.findMany({ orderBy: { updatedAt: "desc" } })); }
export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req); if (!b?.name || !b?.body || !b?.channel) return bad("Name, body and channel are required.");
  return ok(await db.greetingTemplate.create({ data: { name: b.name, subject: b.subject || null, body: b.body, channel: b.channel } }), 201);
}
