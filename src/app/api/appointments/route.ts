import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(req: Request) { if (!await requireSession()) return bad("Unauthorized", 401); return ok(await db.appointment.findMany({ include: { patient: true }, orderBy: { appointmentAt: "asc" } })); }
export async function POST(req: Request) { if (!await requireSession()) return bad("Unauthorized", 401); const b = await parseBody(req); return ok(await db.appointment.create({ data: { patientId: Number(b.patientId), appointmentAt: new Date(b.appointmentAt), purpose: b.purpose || null } }), 201); }
