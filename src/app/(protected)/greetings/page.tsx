import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Menu links here: on to /greetings/org/{active organization object_id}
export default async function GreetingsIndex() {
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { objectId: true },
    });
    if (!org) redirect("/dashboard");
    redirect(`/greetings/org/${encodeURIComponent(org.objectId)}`);
}
