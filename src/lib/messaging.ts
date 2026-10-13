import nodemailer from "nodemailer";
import twilio from "twilio";
import { adnConfigured, adnSendSingle } from "./adnsms";

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
}

// 01XXXXXXXXX / +8801XXXXXXXXX / 8801XXXXXXXXX -> 8801XXXXXXXXX
export function normalizeBdPhone(raw: string) {
  const d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("880")) return d;
  if (d.startsWith("01")) return "88" + d;
  return d;
}

export async function sendSms(to: string, body: string) {
  // ADN SMS first, then BulkSMSBD, otherwise Twilio
  if (adnConfigured()) return adnSendSingle(to, body);
  if (process.env.BULKSMSBD_API_KEY) {
    const url = new URL("http://bulksmsbd.net/api/smsapi");
    url.searchParams.set("api_key", process.env.BULKSMSBD_API_KEY);
    url.searchParams.set("type", "text");
    url.searchParams.set("number", normalizeBdPhone(to));
    url.searchParams.set("senderid", process.env.BULKSMSBD_SENDER_ID || "");
    url.searchParams.set("message", body);
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();
    let d: any = null;
    try { d = JSON.parse(text); } catch {}
    if (!r.ok || (d && Number(d.response_code) !== 202)) {
      throw new Error(`SMS gateway error: ${d?.error_message || d?.response_code || text.slice(0, 120)}`);
    }
    return d;
  }
  if (!process.env.TWILIO_ACCOUNT_SID) throw new Error("SMS is not configured (set ADNSMS_API_KEY and ADNSMS_API_SECRET in .env)");
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({ body, from: process.env.TWILIO_FROM, to: "+" + normalizeBdPhone(to) });
}

export async function sendWhatsApp(to: string, body: string) {
  if (!process.env.WHATSAPP_PROVIDER_URL) throw new Error("WhatsApp provider is not configured");
  const response = await fetch(process.env.WHATSAPP_PROVIDER_URL, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_PROVIDER_TOKEN || ""}` },
    body: JSON.stringify({ to, body })
  });
  if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
  return response.json();
}
