import { addSmsUsage, getSmsBalance, smsQuotaEnabled } from "./thinktech-erp";
import { smsInfo } from "./sms-text";

// SMS one message uses: a long message goes out in parts, each counted as one SMS
export const smsParts = (body: string) => smsInfo(body).parts;

const n = (x: number) => x.toLocaleString("en-US");

// Why these SMS can't be sent from the organization's ThinkTech ERP balance, or null when they
// can (or when no ERP is configured). A balance that can't be checked blocks sending too.
export async function smsQuotaError(objectId: string | undefined, needed: number): Promise<string | null> {
    if (!smsQuotaEnabled()) return null;
    if (!objectId) return "There is no active organization, so its SMS balance can't be checked.";
    const balance = await getSmsBalance(objectId);
    if (balance.status === "failed") return `Could not check the SMS balance: ${balance.error}`;
    if (balance.availableSms < needed)
        return `Not enough SMS balance: this needs ${n(needed)} SMS and ${n(Math.max(0, balance.availableSms))} are left. Contact ThinkTech to add more.`;
    return null;
}

// Adds the SMS the gateway accepted to the organization's usage in the ERP. They are already
// sent, so a failure here is only logged (the ERP's SMS > Organizations page can correct it).
export async function recordSmsUsage(objectId: string | undefined, smsCount: number) {
    if (!smsQuotaEnabled() || !objectId || smsCount <= 0) return;
    const result = await addSmsUsage(objectId, smsCount);
    if (result.status === "failed")
        console.error(`ThinkTech ERP did not record ${smsCount} SMS sent by organization ${objectId}: ${result.error}`);
}
