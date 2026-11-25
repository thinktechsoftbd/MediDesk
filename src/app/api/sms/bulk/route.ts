import { db } from "@/lib/prisma";
import { bad, ok, parseBody } from "@/lib/api";
import { denyUnless } from "@/lib/permissions";
import { adnMobile, validMobile } from "@/lib/adnsms";
import { smsGatewayRequest } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const denied = await denyUnless("GREETING.C"); if (denied) return denied;
    const b = await parseBody(req);
    const message: string = String(b?.message || "").trim();
    if (!message) return bad("Message is required.");
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    const clinic = org?.nameEn || "Dental Care";
    let recipients: { patientId: number | null; name: string; patientNo: string; mobile: string }[] = [];
    if (b?.source === "numbers") {
        recipients = String(b?.numbers || "").split(/[\s,;]+/).filter(Boolean).map((n) => ({ patientId: null, name: "", patientNo: "", mobile: adnMobile(n) }));
    } else {
        const ids = (b?.patientIds || []).map(Number).filter(Boolean);
        if (b?.source === "patients" && !ids.length) return bad("Select at least one patient.");
        const patients = await db.patient.findMany({ where: b?.source === "patients" ? { id: { in: ids } } : {}, select: { id: true, name: true, patientNo: true, phone: true } });
        recipients = patients.map((p) => ({ patientId: p.id, name: p.name, patientNo: p.patientNo, mobile: adnMobile(p.phone || "") }));
    }
    const seen = new Set<string>();
    const skipped: string[] = [];
    const ready = recipients.filter((r) => {
        if (!validMobile(r.mobile)) { skipped.push(r.name || r.mobile || "(blank)"); return false; }
        if (seen.has(r.mobile)) return false;
        seen.add(r.mobile); return true;
    });
    if (!ready.length) return bad("No valid mobile numbers to send to.");
    const rendered = ready.map((r) => ({ ...r, body: message.replaceAll("{{patientName}}", r.name).replaceAll("{{patientNo}}", r.patientNo).replaceAll("{{clinic}}", clinic) }));
    // Gateway request accepts one message per call; send personalized bodies separately when requested.
    const personalized = /\{\{(patientName|patientNo)\}\}/.test(message) && b?.source !== "numbers";
    const sendBodies = personalized ? rendered : [{ ...rendered[0], body: rendered[0].body, mobile: "" }];
    const sentNumbers: string[] = [];
    const idsOut: string[] = [];
    try {
        for (const item of sendBodies) {
            const group = personalized ? [item.mobile] : ready.map((r) => r.mobile);
            // The ERP sends through the organization's provider, from that provider's sender ID.
            const res = await smsGatewayRequest("/api/sms/gateway/send", {
                method: "POST",
                body: JSON.stringify({ serviceType: "non_masking_sms", message: item.body, recipients: group }),
            });
            const data: any = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = data?.error || Object.values(data?.errors || {}).flat()[0] || `SMS gateway returned HTTP ${res.status}.`;
                return bad(String(msg), res.status === 400 ? 400 : 502);
            }
            sentNumbers.push(...group);
            if (data?.messageId) idsOut.push(String(data.messageId));
        }
    } catch (e: any) {
        return bad(e?.message || "Could not reach SMS gateway.", 502);
    }
    const now = new Date();
    const sentSet = new Set(sentNumbers);
    await db.notification.createMany({ data: rendered.map((x) => ({
        patientId: x.patientId, channel: "SMS" as any, recipient: x.mobile,
        subject: `${b?.title?.trim() || "Bulk SMS"}${idsOut.length ? " · " + idsOut.join(", ") : ""}`,
        body: x.body, status: (sentSet.has(x.mobile) ? "SENT" : "FAILED") as any,
        sentAt: sentSet.has(x.mobile) ? now : null, error: sentSet.has(x.mobile) ? null : "SMS gateway send failed",
    })) });
    return ok({ sent: sentSet.size, failed: skipped.length, skipped: skipped.slice(0, 10), invalid: [], campaigns: idsOut, mode: personalized ? "PERSONALIZED" : "BULK" });
}
