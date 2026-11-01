import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
import { checkSubscription } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

// The clinic's subscription in ThinkTech ERP, for the alert above every page
export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const org = await db.organization.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { objectId: true },
    });
    // no organization yet: /api/organization/active creates one on the first page load
    if (!org) return ok({ status: "skipped" });
    return ok(await checkSubscription(org.objectId));
}
