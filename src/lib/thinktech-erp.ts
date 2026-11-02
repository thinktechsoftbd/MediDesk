import type { Organization } from "@prisma/client";

// Server-only client for ThinkTech ERP's integration API. The client secret never reaches the
// browser: it is only sent to the ERP for a short-lived access token, which is kept in memory and
// only works on the ERP's integration endpoints. Configure all three or none (sync is then skipped).
// The subscription check is anonymous and needs only the URL.
const baseUrl = (process.env.THINKTECH_ERP_API_URL || "").replace(/\/+$/, "");
const clientId = process.env.THINKTECH_ERP_CLIENT_ID || "";
const clientSecret = process.env.THINKTECH_ERP_CLIENT_SECRET || "";
// the ERP subscription module MediDesk needs; empty accepts a subscription to any module
const subscriptionModule = (process.env.THINKTECH_ERP_SUBSCRIPTION_MODULE || "").trim();
// Where Renew subscription (on the popup shown while the subscription is not active) goes:
// ThinkTech's pricing page for MediDesk, unless THINKTECH_SUBSCRIPTION_RENEW_URL names another page
const DEFAULT_RENEW_URL = "https://thinktechsoft.com/pricing?modid=2c873e82-c38d-42a2-a98f-8a752999b73e";
const renewUrl = (process.env.THINKTECH_SUBSCRIPTION_RENEW_URL || "").trim() || DEFAULT_RENEW_URL;
// how long one ERP call may take; raise it while stepping through the ERP in a debugger
const configuredTimeout = Number(process.env.THINKTECH_ERP_TIMEOUT_MS);
const timeoutMs = configuredTimeout > 0 ? configuredTimeout : 10_000;

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
        signal: AbortSignal.timeout(timeoutMs),
    });
}

// The ERP answers { error } or, for invalid fields, { errors: { Field: [message] } }
async function erpError(res: Response) {
    const d: any = await res.json().catch(() => null);
    const fieldError = d?.errors && Object.values(d.errors).flat()[0];
    if (d?.error || fieldError) return `${d.error || fieldError}`;
    if (res.status === 401) return "ThinkTech ERP rejected the client credentials.";
    if (res.status === 403) return "ThinkTech ERP refused the request: check the client's scopes (organization.sync, sms.usage).";
    if (res.status === 429) return "Too many requests to ThinkTech ERP. Try again in a minute.";
    return `ThinkTech ERP returned HTTP ${res.status}.`;
}

// what to report for a call that threw: no response, a timeout or a configuration problem
function thrownError(e: unknown, what: string) {
    if (e instanceof ErpError) return e.message;
    if (e instanceof DOMException && e.name === "TimeoutError")
        return `ThinkTech ERP did not answer within ${timeoutMs / 1000} seconds.`;
    console.error(`ThinkTech ERP ${what} failed:`, e);
    return "Could not reach ThinkTech ERP.";
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

const credentialsSet = () => !!(baseUrl && clientId && clientSecret);

// A call with the access token
async function authorizedFetch(path: string, init: RequestInit) {
    const call = async () =>
        erpFetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await accessToken()}` } });
    const res = await call();
    if (res.status !== 401) return res;
    // e.g. the ERP restarted with a new signing key: get a new token once
    token = null;
    return call();
}

function putOrganization(org: Organization) {
    return authorizedFetch(`/api/security/integration/organizations/${encodeURIComponent(org.objectId)}`, {
        method: "PUT",
        // the signature image and the Active flag stay in MediDesk
        body: JSON.stringify({
            nameEn: org.nameEn,
            nameBn: org.nameBn,
            slogan: org.slogan,
            code: org.code,
            organizationType: org.organizationType,
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
    if (!credentialsSet())
        return {
            status: "failed",
            error: "Set THINKTECH_ERP_API_URL, THINKTECH_ERP_CLIENT_ID and THINKTECH_ERP_CLIENT_SECRET.",
        };

    try {
        const res = await putOrganization(org);
        if (!res.ok) return { status: "failed", error: await erpError(res) };
        return { status: "synced" };
    } catch (e) {
        return { status: "failed", error: thrownError(e, "organization sync") };
    }
}

export type SmsBalance = { allocatedSms: number; smsUsage: number; availableSms: number };
export type SmsBalanceResult = ({ status: "ok" } & SmsBalance) | { status: "failed"; error: string };

// With the ERP configured, the clinic sends only the SMS ThinkTech allocated to its organization
// (sms_allocation, less the organization's sms_usage). Needs the client's sms.usage scope.
export const smsQuotaEnabled = credentialsSet;

const smsPath = (objectId: string) => `/api/sms/integration/organizations/${encodeURIComponent(objectId)}`;

async function smsBalanceCall(path: string, init: RequestInit, what: string): Promise<SmsBalanceResult> {
    try {
        const res = await authorizedFetch(path, init);
        if (!res.ok) return { status: "failed", error: await erpError(res) };
        const d = await res.json();
        return {
            status: "ok",
            allocatedSms: Number(d.allocatedSms) || 0,
            smsUsage: Number(d.smsUsage) || 0,
            availableSms: Number(d.availableSms) || 0,
        };
    } catch (e) {
        return { status: "failed", error: thrownError(e, what) };
    }
}

export function getSmsBalance(objectId: string) {
    return smsBalanceCall(`${smsPath(objectId)}/balance`, { method: "GET" }, "SMS balance check");
}

// sms_usage = sms_usage + smsCount; the ERP refuses (409) more than the organization has left
export function addSmsUsage(objectId: string, smsCount: number) {
    return smsBalanceCall(
        `${smsPath(objectId)}/usage`,
        { method: "POST", body: JSON.stringify({ smsCount }) },
        "SMS usage update"
    );
}

export type SubscriptionCheck =
    // no ERP configured
    | { status: "skipped" }
    // the ERP has no organization with this Organization Id (it was never synced)
    | { status: "unregistered" }
    // the ERP could not be asked
    | { status: "failed"; error: string }
    | {
          status: "checked";
          isValid: boolean;
          // why it isn't valid; null when it is
          reason: string | null;
          // the last valid day (yyyy-mm-dd) and the days left until it (0 on that day); null when not valid
          validUntil: string | null;
          daysRemaining: number | null;
      };

// The subscription check as the browser gets it, with where to renew (null: the configured page isn't a web address)
export type SubscriptionStatus = SubscriptionCheck & { renewUrl?: string | null };

// The page the Renew subscription button opens; null (button hidden) when it isn't an http(s) address.
export function subscriptionRenewUrl(): string | null {
    try {
        const url = new URL(renewUrl);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
        return null;
    }
}

// The ERP limits these checks per IP and every MediDesk user shares this server's IP, so an answer
// is reused for 5 minutes (a failure for 1): a renewal in the ERP shows up within that time.
const subscriptionChecks = new Map<string, { value: Promise<SubscriptionCheck>; expiresAt: number }>();

// Whether the organization with this Organization Id (objectId) has a valid subscription in the ERP.
export function checkSubscription(objectId: string): Promise<SubscriptionCheck> {
    if (!baseUrl) return Promise.resolve({ status: "skipped" });
    const cached = subscriptionChecks.get(objectId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    // kept while in flight too, so concurrent page loads share one request
    const entry = { value: fetchSubscription(objectId), expiresAt: Infinity };
    subscriptionChecks.set(objectId, entry);
    entry.value.then((check) => {
        entry.expiresAt = Date.now() + (check.status === "failed" ? 60_000 : 5 * 60_000);
    });
    return entry.value;
}

async function fetchSubscription(objectId: string): Promise<SubscriptionCheck> {
    const query = subscriptionModule ? `?moduleName=${encodeURIComponent(subscriptionModule)}` : "";
    try {
        const res = await erpFetch(`/api/security/subscriptions/validity/${encodeURIComponent(objectId)}${query}`, {
            method: "GET",
        });
        if (res.status === 404) {
            // { error } means no such organization; a bare 404 is an ERP without this endpoint
            const d: any = await res.json().catch(() => null);
            return d?.error ? { status: "unregistered" } : { status: "failed", error: "ThinkTech ERP returned HTTP 404." };
        }
        if (!res.ok) return { status: "failed", error: await erpError(res) };
        const d = await res.json();
        return {
            status: "checked",
            isValid: d.isValid === true,
            reason: d.reason ?? null,
            validUntil: d.validUntil ?? null,
            daysRemaining: d.daysRemaining ?? null,
        };
    } catch (e) {
        return { status: "failed", error: thrownError(e, "subscription check") };
    }
}
