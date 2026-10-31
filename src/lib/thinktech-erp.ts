import type { Organization } from "@prisma/client";

// Server-only client for ThinkTech ERP's integration API. The client secret never reaches the
// browser: it is only sent to the ERP for a short-lived access token, which is kept in memory and
// only works on the ERP's integration endpoints. Configure all three or none (sync is then skipped).
const baseUrl = (process.env.THINKTECH_ERP_API_URL || "").replace(/\/+$/, "");
const clientId = process.env.THINKTECH_ERP_CLIENT_ID || "";
const clientSecret = process.env.THINKTECH_ERP_CLIENT_SECRET || "";

export type ErpSync = { status: "synced" | "skipped" | "failed"; error?: string };

// errors whose message is safe and useful to show to the admin
class ErpError extends Error {}

let token: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

// The secret only travels over HTTPS; plain HTTP is accepted for an ERP on this machine (development)
function checkedBaseUrl() {
    let url: URL;
    try {
        url = new URL(baseUrl);
    } catch {
        throw new ErpError("THINKTECH_ERP_API_URL is not a valid address.");
    }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
        throw new ErpError("THINKTECH_ERP_API_URL must be an https:// address.");
    return baseUrl;
}

function erpFetch(path: string, init: RequestInit) {
    return fetch(checkedBaseUrl() + path, {
        ...init,
        headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
        cache: "no-store",
        // never follow a redirect with the secret or token on the request
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
    });
}

// The ERP answers { error } or, for invalid fields, { errors: { Field: [message] } }
async function erpError(res: Response) {
    const d: any = await res.json().catch(() => null);
    const fieldError = d?.errors && Object.values(d.errors).flat()[0];
    if (d?.error || fieldError) return `${d.error || fieldError}`;
    if (res.status === 401) return "ThinkTech ERP rejected the client credentials.";
    if (res.status === 429) return "Too many requests to ThinkTech ERP. Try again in a minute.";
    return `ThinkTech ERP returned HTTP ${res.status}.`;
}

async function accessToken() {
    // renewed a minute early so it never expires mid-request
    if (token && token.expiresAt - 60_000 > Date.now()) return token.value;
    tokenRequest ??= (async () => {
        const res = await erpFetch("/api/security/integration/token", {
            method: "POST",
            body: JSON.stringify({ clientId, clientSecret }),
        });
        if (!res.ok) throw new ErpError(await erpError(res));
        const d = await res.json();
        token = { value: d.accessToken, expiresAt: Date.now() + d.expiresIn * 1000 };
        return token.value;
    })().finally(() => {
        tokenRequest = null;
    });
    return tokenRequest;
}

function putOrganization(org: Organization, bearer: string) {
    return erpFetch(`/api/security/integration/organizations/${encodeURIComponent(org.objectId)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${bearer}` },
        // the signature image and the Active flag stay in MediDesk
        body: JSON.stringify({
            nameEn: org.nameEn,
            nameBn: org.nameBn,
            slogan: org.slogan,
            code: org.code,
            email: org.email,
            phone: org.phone,
            website: org.website,
            addressLine1: org.addressLine1,
            addressLine2: org.addressLine2,
            city: org.city,
            state: org.state,
            postalCode: org.postalCode,
            country: org.country,
            logoUrl: org.logoUrl,
        }),
    });
}

// Creates or updates the organization in ThinkTech ERP under its Organization Id (objectId).
// Runs after MediDesk's own save; a failure is reported back, and saving again retries.
export async function syncOrganizationToErp(org: Organization): Promise<ErpSync> {
    if (!baseUrl && !clientId && !clientSecret) return { status: "skipped" };
    if (!baseUrl || !clientId || !clientSecret)
        return {
            status: "failed",
            error: "Set THINKTECH_ERP_API_URL, THINKTECH_ERP_CLIENT_ID and THINKTECH_ERP_CLIENT_SECRET.",
        };

    try {
        let res = await putOrganization(org, await accessToken());
        if (res.status === 401) {
            // e.g. the ERP restarted with a new signing key: get a new token once
            token = null;
            res = await putOrganization(org, await accessToken());
        }
        if (!res.ok) return { status: "failed", error: await erpError(res) };
        return { status: "synced" };
    } catch (e) {
        if (e instanceof ErpError) return { status: "failed", error: e.message };
        console.error("ThinkTech ERP organization sync failed:", e);
        return { status: "failed", error: "Could not reach ThinkTech ERP." };
    }
}
