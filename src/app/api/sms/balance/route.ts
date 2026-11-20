import { bad, ok, requireSession } from "@/lib/api";
import { smsGatewayRequest, smsProviderId } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    try {
        const res = await smsGatewayRequest(`/api/sms/gateway/${smsProviderId}/balance`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok) return ok({ balance: null, error: data?.error || `SMS gateway returned HTTP ${res.status}.` });
        const amount = data?.balance ?? data?.availableBalance ?? data?.credit ?? data?.walletBalance ?? null;
        return ok({ ...data, source: "gateway", balance: amount });
    } catch (e: any) { return ok({ balance: null, error: e?.message || "Could not reach SMS gateway." }); }
}
