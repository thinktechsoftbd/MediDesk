import { bad, ok, requireSession } from "@/lib/api";
import { smsGatewayRequest, smsProviderId } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

// Delivery of a message sent earlier: ?uid={messageId} from the gateway send result
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const uid = new URL(req.url).searchParams.get("uid")?.trim();
    if (!uid) return bad("Campaign id is required.");
    try {
        const res = await smsGatewayRequest(
            `/api/sms/gateway/${smsProviderId}/messages/${encodeURIComponent(uid)}/status`,
            { method: "GET" }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) return bad(data?.error || `SMS gateway returned HTTP ${res.status}.`, 502);
        return ok({
            ...data,
            delivered: data?.delivered ?? 0,
            failed: data?.failed ?? 0,
            summary: {
                success: data?.delivered ?? 0,
                pending: 0,
                failed: data?.failed ?? 0,
            },
        });
    } catch (e: any) {
        return bad(e?.message || "Status check failed.", 502);
    }
}
