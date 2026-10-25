import { bad, ok, requireSession } from "@/lib/api";
import { db } from "@/lib/prisma";
import { PATIENT_FORM } from "@/lib/patient-fields";

export const dynamic = "force-dynamic";

// form fields hidden for the signed-in user (set on Security > Users): ?form=PATIENT
export async function GET(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const form = new URL(req.url).searchParams.get("form") || PATIENT_FORM;
    const rows = await db.userHiddenField.findMany({
        where: { userId: Number(session.user?.id), form },
        select: { field: true },
    });
    return ok({ fields: rows.map((r: any) => r.field) });
}
