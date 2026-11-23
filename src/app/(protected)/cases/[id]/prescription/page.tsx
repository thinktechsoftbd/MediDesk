import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The prescription page lives at /cases/{case id}/{patient object_id}/prescription; older links here go on to it
export default async function PrescriptionRedirect({ params }: { params: { id: string } }) {
    if (!(await getSession())) redirect("/login");
    const id = Number(params.id);
    const c = Number.isInteger(id) && id > 0
        ? await db.caseHistory.findUnique({ where: { id }, select: { patient: { select: { objectId: true } } } })
        : null;
    if (!c) notFound();
    redirect(`/cases/${id}/${c.patient.objectId}/prescription`);
}
