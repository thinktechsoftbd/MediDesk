import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import BulkSms from "../../page";

export default async function OrganizationBulkSms({ params }: { params: { organizationId: string } }) {
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { objectId: true } });
    if (!org) redirect("/dashboard");
    if (params.organizationId !== org.objectId) notFound();
    return <BulkSms />;
}
