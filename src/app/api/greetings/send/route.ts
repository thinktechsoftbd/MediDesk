import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { sendEmail, sendSms, sendWhatsApp } from "@/lib/messaging";

function render(body: string, patient: any) {
  return body.replaceAll("{{patientName}}", patient.name).replaceAll("{{phone}}", patient.phone).replaceAll("{{patientNo}}", patient.patientNo);
}

export async function POST(req: Request) {
  { const denied = await denyUnless("GREETING.C"); if (denied) return denied; }
  const b = await parseBody(req);
  if (!b?.patientId || !b?.templateId) return bad("Patient and template are required.");
  const [patient, template] = await Promise.all([
    db.patient.findUnique({ where: { id: Number(b.patientId) } }),
    db.greetingTemplate.findUnique({ where: { id: Number(b.templateId) } })
  ]);
  if (!patient || !template) return bad("Patient or template not found.", 404);
  const body = render(template.body, patient);
  const recipient = b.recipient || (template.channel === "EMAIL" ? patient.email : patient.phone);
  if (!recipient) return bad("No recipient is available.");
  const notification = await db.notification.create({ data: { patientId: patient.id, templateId: template.id, channel: template.channel, recipient, subject: template.subject, body } });
  try {
    if (template.channel === "EMAIL") await sendEmail(recipient, template.subject || template.name, body);
    if (template.channel === "SMS") await sendSms(recipient, body);
    if (template.channel === "WHATSAPP") await sendWhatsApp(recipient, body);
    return ok(await db.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date() } }));
  } catch (e: any) {
    return ok(await db.notification.update({ where: { id: notification.id }, data: { status: "FAILED", error: e.message } }), 502);
  }
}
