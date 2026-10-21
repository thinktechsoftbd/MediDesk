import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
import { getPermissionCodes } from "@/lib/permissions";

const toDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

// The case to write this patient's prescription on, for patient search:
// the latest open one (Open / In Progress), else a new case for today.
// Returns { id, created }; { id: null } when there is none and the user may not create cases.
export async function POST(_: Request, { params }: { params: { id: string } }) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const patientId = Number(params.id);
    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) return bad("Patient not found", 404);

    const open = await db.caseHistory.findFirst({
        where: { patientId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { caseNo: "desc" },
        select: { id: true },
    });
    if (open) return ok({ id: open.id, created: false });

    const codes = await getPermissionCodes(Number(session.user?.id));
    if (!codes.includes("CASE.C")) return ok({ id: null, created: false });

    // next case number, retry if two searches open one at the same moment
    for (let attempt = 0; attempt < 3; attempt++) {
        const last = await db.caseHistory.findFirst({ where: { patientId }, orderBy: { caseNo: "desc" }, select: { caseNo: true } });
        try {
            const c = await db.caseHistory.create({
                data: { patientId, caseNo: (last?.caseNo || 0) + 1, caseDate: toDay(new Date()), status: "IN_PROGRESS" },
            });
            return ok({ id: c.id, created: true }, 201);
        } catch (e: any) {
            if (e?.code !== "P2002") throw e;
        }
    }
    return bad("Could not open a new case, try again.", 500);
}
