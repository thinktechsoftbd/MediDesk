import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { followUpWhere } from "@/lib/follow-ups";
import { sendSms } from "@/lib/messaging";
import { adnConfigured, adnSendBulk, adnSendMultibody, adnMobile, validMobile, maxLength } from "@/lib/adnsms";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Send follow-up reminder SMS.
// mode "all": every case matching the same filters as the list
// mode "selected": only the given case ids
export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  const message: string = (b?.message || "").trim();
  if (!message) return bad("Message is required.");

  let where: any;
  if (b?.mode === "all") {
    where = followUpWhere(b.filters || {});
  } else {
    const ids: number[] = (b?.ids || []).map(Number).filter(Boolean);
    if (!ids.length) return bad("No patients selected.");
    where = { id: { in: ids }, followUpDate: { not: null } };
  }
  if (b?.skipSent !== false) {
    where = { AND: [where, { followUpSmsSentAt: null }] };
  }

  const cases = await db.caseHistory.findMany({ where, include: { patient: true }, take: 5000 });
  if (!cases.length) return bad("Nothing to send: all matching patients were already notified.");

  const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
  const clinic = org?.nameEn || "Mohonto Dental Care";

  const render = (c: any) =>
    message
      .replaceAll("{{patientName}}", c.patient.name)
      .replaceAll("{{date}}", fmt(new Date(c.followUpDate)))
      .replaceAll("{{clinic}}", clinic)
      .replaceAll("{{patientNo}}", c.patient.patientNo);

  // ADN SMS: one campaign request (bulk when the text is identical, multibody when personalised)
  if (adnConfigured()) {
    const ready: { c: any; mobile: string; body: string }[] = [];
    const skipped: string[] = [];
    for (const c of cases as any[]) {
      const mobile = adnMobile(c.patient?.phone || "");
      if (!validMobile(mobile)) { skipped.push(c.patient?.name || `#${c.id}`); continue; }
      ready.push({ c, mobile, body: render(c) });
    }
    if (!ready.length) return bad("None of the selected patients has a valid mobile number.");
    const tooLong = ready.find((x) => x.body.length > maxLength(x.body));
    if (tooLong) return bad(`Message is too long (${tooLong.body.length} characters, max ${maxLength(tooLong.body)}).`);

    const personalised = /\{\{(patientName|date|patientNo)\}\}/.test(message);
    const title = `Follow-up reminder ${fmt(new Date())}`;
    let result;
    try {
      result = personalised
        ? await adnSendMultibody(ready.map((x) => ({ mobile: x.mobile, body: x.body })), title)
        : await adnSendBulk(ready.map((x) => x.mobile), ready[0].body, title, false);
    } catch (e: any) {
      return bad(e?.message || "SMS sending failed.", 502);
    }

    const invalid = new Set(result.invalid);
    const campaign = result.campaignUids.join(", ");
    const now = new Date();
    let sent = 0;
    for (const x of ready) {
      const good = !invalid.has(x.mobile);
      await db.notification.create({
        data: {
          patientId: x.c.patientId, channel: "SMS", recipient: x.mobile,
          subject: `Follow-up reminder${campaign ? " · " + campaign : ""}`, body: x.body,
          status: good ? "SENT" : "FAILED", sentAt: good ? now : null, error: good ? null : "Invalid number (ADN SMS)",
        },
      });
      if (good) {
        await db.caseHistory.update({ where: { id: x.c.id }, data: { followUpSmsSentAt: now } });
        sent++;
      }
    }
    const failed = skipped.length + invalid.size;
    const errors = [
      ...(skipped.length ? [`No valid mobile: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""}`] : []),
      ...(invalid.size ? [`Rejected by gateway: ${Array.from(invalid).slice(0, 3).join(", ")}`] : []),
    ];
    return ok({ sent, failed, total: cases.length, errors, campaign });
  }

  let sent = 0, failed = 0;
  const errors: string[] = [];
  for (const c of cases as any[]) {
    const phone = c.patient?.phone;
    if (!phone) { failed++; continue; }
    const body = render(c);
    const n = await db.notification.create({
      data: { patientId: c.patientId, channel: "SMS", recipient: phone, subject: "Follow-up reminder", body },
    });
    try {
      await sendSms(phone, body);
      await db.notification.update({ where: { id: n.id }, data: { status: "SENT", sentAt: new Date() } });
      await db.caseHistory.update({ where: { id: c.id }, data: { followUpSmsSentAt: new Date() } });
      sent++;
    } catch (e: any) {
      await db.notification.update({ where: { id: n.id }, data: { status: "FAILED", error: e?.message } });
      failed++;
      if (errors.length < 3) errors.push(`${c.patient.name}: ${e?.message}`);
    }
  }
  return ok({ sent, failed, total: cases.length, errors });
}
