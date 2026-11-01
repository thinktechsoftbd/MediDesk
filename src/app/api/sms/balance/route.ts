import { bad, ok, requireSession } from "@/lib/api";
import { db } from "@/lib/prisma";
import { adnBalance, adnConfigured } from "@/lib/adnsms";
import { getSmsBalance, smsQuotaEnabled } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

// SMS left to send: the organization's ThinkTech ERP allocation less its usage when the ERP is
// configured, otherwise the ADN SMS account balance (prepaid accounts)
export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    if (smsQuotaEnabled()) {
        const org = await db.organization.findFirst({
            where: { isActive: true },
            orderBy: { id: "asc" },
            select: { objectId: true },
        });
        const gateway = adnConfigured();
        if (!org) return ok({ source: "erp", configured: true, gateway, balance: null, error: "No active organization." });
        const b = await getSmsBalance(org.objectId);
        return b.status === "ok"
            ? ok({ source: "erp", configured: true, gateway, balance: b.availableSms, allocated: b.allocatedSms, used: b.smsUsage })
            : ok({ source: "erp", configured: true, gateway, balance: null, error: b.error });
    }
    if (!adnConfigured()) return ok({ configured: false, balance: null });
    try {
        return ok({ configured: true, balance: await adnBalance() });
    } catch (e: any) {
        return ok({ configured: true, balance: null, error: e?.message });
    }
}
