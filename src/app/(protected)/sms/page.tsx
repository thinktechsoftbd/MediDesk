import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Menu links here: on to /sms/{active organization object_id}/bulksms
export default async function SmsIndex() {
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { objectId: true },
    });
    if (!org) redirect("/dashboard");
    redirect(`/sms/${encodeURIComponent(org.objectId)}/bulksms`);
}
