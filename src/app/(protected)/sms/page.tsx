import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";

export default async function SmsIndex() {
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { objectId: true } });
    if (!org) redirect("/dashboard");
    redirect(`/sms/${encodeURIComponent(org.objectId)}/bulksms`);
}
