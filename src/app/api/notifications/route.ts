import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const patientId = Number(new URL(req.url).searchParams.get("patientId") || 0);
  return ok(await db.notification.findMany({ where: patientId ? { patientId } : {}, include: { patient: true }, orderBy: { createdAt: "desc" } }));
}
