import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import Greetings from "@/components/greetings";

export const dynamic = "force-dynamic";

// /greetings/org/{active organization object_id} — another org id redirects to the active one
export default async function OrganizationGreetings({ params }: { params: { organizationId: string } }) {
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { objectId: true },
    });
    if (!org) redirect("/dashboard");
    if (params.organizationId.toLowerCase() !== org.objectId.toLowerCase()) {
        redirect(`/greetings/org/${encodeURIComponent(org.objectId)}`);
    }
    return <Greetings />;
}
