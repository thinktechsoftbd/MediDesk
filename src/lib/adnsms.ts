// ADN SMS gateway (portal.adnsms.com) — API v1
// Env: ADNSMS_API_URL (default https://portal.adnsms.com), ADNSMS_API_KEY, ADNSMS_API_SECRET

const ERRORS: Record<number, string> = {
    2001: "Invalid number",
    2002: "Message too long (900 chars text, 750 for Banglalink, 500 for Bangla/Unicode)",
    2003: "Invalid parameter",
    2004: "Too many recipients in one request",
    2005: "Invalid message type",
    3001: "Invalid API key or secret",
    4001: "SMS account disabled",
    4002: "Sender mask disabled",
    4003: "API access disabled",
    4004: "Server IP is blacklisted at ADN SMS",
    4005: "Insufficient SMS balance",
    4006: "Account not configured",
    5001: "Unknown gateway error",
    5004: "Record not found",
};

export const BULK_LIMIT = 1000; // GENERAL_CAMPAIGN recipients per request
export const MULTI_LIMIT = 500; // MULTIBODY_CAMPAIGN recipients per request

export function adnConfigured() {
    return !!(process.env.ADNSMS_API_KEY && process.env.ADNSMS_API_SECRET);
}

// any non-ASCII character (e.g. Bangla) needs UNICODE
export function messageType(body: string): "TEXT" | "UNICODE" {
    return /[^\x00-\x7F]/.test(body) ? "UNICODE" : "TEXT";
}

export function maxLength(body: string) {
    return messageType(body) === "UNICODE" ? 500 : 900;
}

// 8801XXXXXXXXX / +8801… / 01… -> 01XXXXXXXXX (format ADN expects)
export function adnMobile(raw: string) {
    let d = (raw || "").replace(/\D/g, "");
    if (d.startsWith("880")) d = d.slice(2);
    else if (d.startsWith("1") && d.length === 10) d = "0" + d;
    return d;
}

export const validMobile = (m: string) => /^01[3-9]\d{8}$/.test(m);

async function call(path: string, params: Record<string, string>) {
    if (!adnConfigured()) throw new Error("ADN SMS is not configured (set ADNSMS_API_KEY and ADNSMS_API_SECRET in .env)");
    const base = (process.env.ADNSMS_API_URL || "https://portal.adnsms.com").replace(/\/+$/, "");
    const form = new URLSearchParams({
        api_key: process.env.ADNSMS_API_KEY!,
        api_secret: process.env.ADNSMS_API_SECRET!,
        ...params,
    });
    const r = await fetch(base + path, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        cache: "no-store",
    });
    const text = await r.text();
    let d: any = null;
    try {
        d = JSON.parse(text);
    } catch {
        throw new Error(`ADN SMS returned an unexpected response (${r.status}): ${text.slice(0, 120)}`);
    }
    if (Number(d?.api_response_code) !== 200) {
        const code = Number(d?.error?.error_code);
        throw new Error(`ADN SMS: ${ERRORS[code] || d?.error?.error_message || d?.api_response_message || "request failed"}${code ? ` (${code})` : ""}`);
    }
    return d;
}

export async function adnBalance(): Promise<number> {
    const d = await call("/api/v1/secure/check-balance", {});
    return Number(d?.balance?.sms ?? 0);
}

export async function adnCampaignStatus(campaignUid: string) {
    const d = await call("/api/v1/secure/campaign-status", { campaign_uid: campaignUid });
    return d.campaign;
}

export async function adnSmsStatus(smsUid: string) {
    const d = await call("/api/v1/secure/sms-status", { sms_uid: smsUid });
    return d.sms;
}

export async function adnSendSingle(mobile: string, body: string) {
    return call("/api/v1/secure/send-sms", {
        request_type: "SINGLE_SMS",
        message_type: messageType(body),
        mobile: adnMobile(mobile),
        message_body: body,
    });
}

export type CampaignResult = { campaignUids: string[]; invalid: string[]; requested: number };

// Same message to many numbers; split into batches of 1000.
export async function adnSendBulk(mobiles: string[], body: string, title: string, promotional = false): Promise<CampaignResult> {
    const list = Array.from(new Set(mobiles.map(adnMobile).filter(Boolean)));
    const out: CampaignResult = { campaignUids: [], invalid: [], requested: list.length };
    for (let i = 0; i < list.length; i += BULK_LIMIT) {
        const chunk = list.slice(i, i + BULK_LIMIT);
        const type = messageType(body);
        const params: Record<string, string> = {
            request_type: "GENERAL_CAMPAIGN",
            message_type: type,
            mobile: chunk.join(","),
            message_body: body,
            campaign_title: list.length > BULK_LIMIT ? `${title} (${i / BULK_LIMIT + 1})` : title,
        };
        if (type === "TEXT") params.isPromotional = promotional ? "1" : "0";
        const d = await call("/api/v1/secure/send-sms", params);
        if (d.campaign_uid) out.campaignUids.push(d.campaign_uid);
        out.invalid.push(...(d.invalid_numbers || []).map(adnMobile));
    }
    return out;
}

// Different message per number; split into batches of 500.
export async function adnSendMultibody(items: { mobile: string; body: string }[], title: string): Promise<CampaignResult> {
    const list = items.map((x) => ({ mobile: adnMobile(x.mobile), body: x.body })).filter((x) => x.mobile);
    const out: CampaignResult = { campaignUids: [], invalid: [], requested: list.length };
    for (let i = 0; i < list.length; i += MULTI_LIMIT) {
        const chunk = list.slice(i, i + MULTI_LIMIT);
        const type = chunk.some((x) => messageType(x.body) === "UNICODE") ? "UNICODE" : "TEXT";
        const params: Record<string, string> = {
            request_type: "MULTIBODY_CAMPAIGN",
            message_type: type,
            campaign_title: list.length > MULTI_LIMIT ? `${title} (${i / MULTI_LIMIT + 1})` : title,
        };
        chunk.forEach((x, k) => {
            params[`sms[${k}][mobile]`] = x.mobile;
            params[`sms[${k}][message_body]`] = x.body;
        });
        const d = await call("/api/v1/secure/send-sms", params);
        if (d.campaign_uid) out.campaignUids.push(d.campaign_uid);
        out.invalid.push(...(d.invalid_numbers || []).map(adnMobile));
    }
    return out;
}
