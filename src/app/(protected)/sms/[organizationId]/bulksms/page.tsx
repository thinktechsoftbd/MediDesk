import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import BulkSms from "@/components/bulk-sms";

export const dynamic = "force-dynamic";

// /sms/{active organization object_id}/bulksms — wrong org id redirects to the active one
export default async function OrganizationBulkSms({ params }: { params: { organizationId: string } }) {
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { objectId: true },
    });
    if (!org) redirect("/dashboard");
    if (params.organizationId.toLowerCase() !== org.objectId.toLowerCase()) {
        redirect(`/sms/${encodeURIComponent(org.objectId)}/bulksms`);
    }
    return <BulkSms />;
}
