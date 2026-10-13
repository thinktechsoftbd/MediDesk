import { bad, ok, requireSession } from "@/lib/api";
import { adnBalance, adnConfigured } from "@/lib/adnsms";

export const dynamic = "force-dynamic";

// Remaining ADN SMS balance (prepaid accounts)
export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    if (!adnConfigured()) return ok({ configured: false, balance: null });
    try {
        return ok({ configured: true, balance: await adnBalance() });
    } catch (e: any) {
        return ok({ configured: true, balance: null, error: e?.message });
    }
}
