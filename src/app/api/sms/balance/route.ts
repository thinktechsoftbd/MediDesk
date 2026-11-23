import { bad, ok, requireSession } from "@/lib/api";
import { smsGatewayRequest, smsProviderId } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

// SMS balance (GET /api/sms/gateway/{providerId}/balance): for MediDesk's client token the ERP answers with
// this organization's SMS (allocated − used) as smsBalance; a provider wallet amount is only the fallback
export async function GET() {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    try {
        const res = await smsGatewayRequest(`/api/sms/gateway/${smsProviderId}/balance`, { method: "GET" });
        const data = await res.json().catch(() => null);
        if (!res.ok) return ok({ balance: null, error: data?.error || `SMS gateway returned HTTP ${res.status}.` });
        const amount =
            data?.smsBalance ??
            data?.availableCredit ??
            data?.walletBalance ??
            data?.balance ??
            data?.availableBalance ??
            data?.credit ??
            null;
        return ok({ ...data, source: "gateway", balance: amount != null ? Number(amount) : null });
    } catch (e: any) {
        return ok({ balance: null, error: e?.message || "Could not reach SMS gateway." });
    }
}
