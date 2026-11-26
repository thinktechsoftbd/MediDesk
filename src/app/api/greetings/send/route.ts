import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody } from "@/lib/api";
import { sendEmail, sendWhatsApp } from "@/lib/messaging";
import { adnMobile, validMobile } from "@/lib/adnsms";
import { smsInfo } from "@/lib/sms-text";
import { gatewaySmsBalance, sendGatewaySms } from "@/lib/thinktech-erp";

export const dynamic = "force-dynamic";

const MAX_PATIENTS = 1000;
const PLACEHOLDERS = /\{\{(patientName|phone|patientNo)\}\}/;

function render(body: string, patient: any) {
  return body.replaceAll("{{patientName}}", patient.name).replaceAll("{{phone}}", patient.phone).replaceAll("{{patientNo}}", patient.patientNo);
}

// { templateId, patientIds: number[] } (or one patientId): the template to every patient, by its channel.
// SMS go through the ThinkTech ERP gateway, which needs enough SMS balance for all of them and adds them to the
// organization's usage itself; email goes over SMTP and WhatsApp through its provider. Patients without a mobile
// number (SMS / WhatsApp) or an email address (email) are skipped. Every message is logged under Notifications.
export async function POST(req: Request) {
  { const denied = await denyUnless("GREETING.C"); if (denied) return denied; }
  const b = await parseBody(req);
  const ids = Array.from(new Set<number>((b?.patientIds ?? (b?.patientId ? [b.patientId] : [])).map(Number).filter((n: number) => n > 0)));
  if (!ids.length || !b?.templateId) return bad("Select a template and at least one patient.");
  if (ids.length > MAX_PATIENTS) return bad(`Send to ${MAX_PATIENTS.toLocaleString("en-US")} patients at most at a time.`);

  const [template, patients] = await Promise.all([
    db.greetingTemplate.findUnique({ where: { id: Number(b.templateId) } }),
    db.patient.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, email: true, patientNo: true } }),
  ]);
  if (!template) return bad("Template not found.", 404);
  // an email template needs SMTP; say so rather than fail on every patient (e.g. ENOTFOUND smtp.example.com)
  const smtpHost = (process.env.SMTP_HOST || "").trim();
  if (template.channel === "EMAIL" && (!smtpHost || smtpHost.endsWith("example.com")))
    return bad(`"${template.name}" is an email template, and email isn't set up (SMTP_HOST in .env). To send SMS, choose an SMS template (Template Management → Channel: SMS).`);

  const skipped: string[] = [];
  const ready: { patient: (typeof patients)[number]; recipient: string; body: string }[] = [];
  for (const p of patients) {
    const recipient = template.channel === "EMAIL" ? (p.email || "").trim() : template.channel === "SMS" ? adnMobile(p.phone || "") : (p.phone || "").trim();
    const usable = template.channel === "EMAIL" ? recipient.includes("@") : template.channel === "SMS" ? validMobile(recipient) : !!recipient;
    if (usable) ready.push({ patient: p, recipient, body: render(template.body, p) });
    else skipped.push(p.name);
  }
  if (!ready.length)
    return bad(`None of the selected patients has ${template.channel === "EMAIL" ? "an email address" : "a valid mobile number"}.`);

  // per patient: { error } (null when sent) and the provider's message id
  const results = new Map<number, { error: string | null; messageId?: string | null }>();
  if (template.channel === "SMS") {
    const tooLong = ready.find((x) => smsInfo(x.body).over);
    if (tooLong) return bad(`The SMS for ${tooLong.patient.name} is too long (max ${smsInfo(tooLong.body).max} characters).`);
    const needed = ready.reduce((n, x) => n + smsInfo(x.body).parts, 0);
    const balance = await gatewaySmsBalance();
    if (balance.balance == null) return bad(`Could not check the SMS balance: ${balance.error}.`);
    if (balance.balance < needed)
      return bad(`Not enough SMS balance: this needs ${needed.toLocaleString("en-US")} SMS and ${Math.max(0, balance.balance).toLocaleString("en-US")} are left.`);

    if (!PLACEHOLDERS.test(template.body)) {
      // the same text for everyone: one request to all the numbers
      const sent = await sendGatewaySms(ready.map((x) => x.recipient), ready[0].body);
      for (const x of ready) results.set(x.patient.id, sent.ok ? { error: null, messageId: sent.messageId } : { error: sent.error });
    } else {
      for (const x of ready) {
        const sent = await sendGatewaySms([x.recipient], x.body);
        results.set(x.patient.id, sent.ok ? { error: null, messageId: sent.messageId } : { error: sent.error });
      }
    }
  } else {
    for (const x of ready) {
      try {
        if (template.channel === "EMAIL") await sendEmail(x.recipient, template.subject || template.name, x.body);
        else await sendWhatsApp(x.recipient, x.body);
        results.set(x.patient.id, { error: null });
      } catch (e: any) {
        results.set(x.patient.id, { error: e?.message || "Sending failed." });
      }
    }
  }

  const now = new Date();
  await db.notification.createMany({
    data: ready.map((x) => {
      const r = results.get(x.patient.id)!;
      return {
        patientId: x.patient.id, templateId: template.id, channel: template.channel, recipient: x.recipient,
        subject: `${template.subject || template.name}${r.messageId ? " · " + r.messageId : ""}`, body: x.body,
        status: (r.error ? "FAILED" : "SENT") as any, sentAt: r.error ? null : now, error: r.error,
      };
    }),
  });
  const failures = ready.filter((x) => results.get(x.patient.id)!.error);
  return ok({
    sent: ready.length - failures.length,
    failed: failures.length,
    skipped: skipped.length,
    skippedNames: skipped.slice(0, 10),
    errors: Array.from(new Set(failures.map((x) => results.get(x.patient.id)!.error))).slice(0, 3),
  });
}
