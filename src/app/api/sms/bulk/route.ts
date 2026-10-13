import { db } from "@/lib/prisma";
import { bad, ok, parseBody } from "@/lib/api";
import { denyUnless } from "@/lib/permissions";
import { adnConfigured, adnSendBulk, adnSendMultibody, adnMobile, validMobile, maxLength } from "@/lib/adnsms";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Bulk SMS through ADN SMS.
// body: { source: "all" | "patients" | "numbers", patientIds?, numbers?, message, title?, promotional? }
export async function POST(req: Request) {
    { const denied = await denyUnless("GREETING.C"); if (denied) return denied; }
    if (!adnConfigured()) return bad("ADN SMS is not configured. Set ADNSMS_API_KEY and ADNSMS_API_SECRET in .env.");

    const b = await parseBody(req);
    const message: string = (b?.message || "").trim();
    if (!message) return bad("Message is required.");

    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    const clinic = org?.nameEn || "Dental Care";
    const title = (b?.title || "").trim() || `Bulk SMS ${fmt(new Date())}`;

    // recipients
    let recipients: { patientId: number | null; name: string; patientNo: string; mobile: string }[] = [];
    if (b?.source === "numbers") {
        const raw: string[] = String(b?.numbers || "").split(/[\s,;]+/).filter(Boolean);
        recipients = raw.map((n) => ({ patientId: null, name: "", patientNo: "", mobile: adnMobile(n) }));
    } else {
        const where: any = b?.source === "patients" ? { id: { in: (b?.patientIds || []).map(Number).filter(Boolean) } } : {};
        if (b?.source === "patients" && !where.id.in.length) return bad("Select at least one patient.");
        const patients = await db.patient.findMany({ where, select: { id: true, name: true, patientNo: true, phone: true } });
        recipients = patients.map((p: any) => ({ patientId: p.id, name: p.name, patientNo: p.patientNo, mobile: adnMobile(p.phone || "") }));
    }

    // de-duplicate by number, drop invalid ones
    const seen = new Set<string>();
    const skipped: string[] = [];
    const ready = recipients.filter((r) => {
        if (!validMobile(r.mobile)) { skipped.push(r.name || r.mobile || "(blank)"); return false; }
        if (seen.has(r.mobile)) return false;
        seen.add(r.mobile);
        return true;
    });
    if (!ready.length) return bad("No valid mobile numbers to send to.");

    const render = (r: any) =>
        message.replaceAll("{{patientName}}", r.name).replaceAll("{{patientNo}}", r.patientNo).replaceAll("{{clinic}}", clinic);
    const bodies = ready.map((r) => ({ ...r, body: render(r) }));
    const tooLong = bodies.find((x) => x.body.length > maxLength(x.body));
    if (tooLong) return bad(`Message is too long (${tooLong.body.length} characters, max ${maxLength(tooLong.body)}).`);

    const personalised = /\{\{(patientName|patientNo)\}\}/.test(message) && b?.source !== "numbers";
    let result;
    try {
        result = personalised
            ? await adnSendMultibody(bodies.map((x) => ({ mobile: x.mobile, body: x.body })), title)
            : await adnSendBulk(bodies.map((x) => x.mobile), bodies[0].body, title, !!b?.promotional);
    } catch (e: any) {
        return bad(e?.message || "SMS sending failed.", 502);
    }

    const invalid = new Set(result.invalid);
    const campaign = result.campaignUids.join(", ");
    const now = new Date();
    await db.notification.createMany({
        data: bodies.map((x) => {
            const good = !invalid.has(x.mobile);
            return {
                patientId: x.patientId, channel: "SMS" as any, recipient: x.mobile,
                subject: `${title}${campaign ? " · " + campaign : ""}`, body: x.body,
                status: (good ? "SENT" : "FAILED") as any, sentAt: good ? now : null, error: good ? null : "Invalid number (ADN SMS)",
            };
        }),
    });

    return ok({
        sent: bodies.length - invalid.size,
        failed: invalid.size + skipped.length,
        skipped: skipped.slice(0, 10),
        invalid: Array.from(invalid).slice(0, 10),
        campaigns: result.campaignUids,
        mode: personalised ? "MULTIBODY_CAMPAIGN" : "GENERAL_CAMPAIGN",
    });
}
