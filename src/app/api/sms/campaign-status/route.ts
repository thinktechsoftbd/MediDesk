import { bad, ok, requireSession } from "@/lib/api";
import { adnCampaignStatus } from "@/lib/adnsms";

export const dynamic = "force-dynamic";

// Delivery summary of one ADN campaign: ?uid=CXXXX
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const uid = new URL(req.url).searchParams.get("uid")?.trim();
    if (!uid) return bad("Campaign id is required.");
    try {
        return ok(await adnCampaignStatus(uid));
    } catch (e: any) {
        return bad(e?.message || "Status check failed.", 502);
    }
}
