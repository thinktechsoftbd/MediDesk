import { db } from "@/lib/prisma";
import { adnMobile, validMobile } from "@/lib/adnsms";
import { withRunningAgreement } from "@/lib/agreements";
import { smsInfo } from "@/lib/sms-text";
import { gatewaySmsBalance, sendGatewaySms } from "@/lib/thinktech-erp";

// Patient Visit SMS, from the case's prescription page: a collection there, and saving a new follow-up date,
// text the patient when they have paid at least PATIENT_VISIT_SMS_MIN_COLLECTED (default 1000) in all and the
// SMS balance covers the message. The texts stay in English letters ("Tk", not ৳): one Bangla character would
// make the whole SMS Unicode, 70 characters a part instead of 160.
const configuredMin = Number(process.env.PATIENT_VISIT_SMS_MIN_COLLECTED);
export const smsMinCollected = Number.isFinite(configuredMin) && configuredMin >= 0 ? configuredMin : 1000;

export const FOLLOW_UP_SMS = "Dear {{patientName}}, your next follow-up at {{clinic}} is on {{date}}. Thank you.";
export const COLLECTION_SMS = "Dear {{patientName}}, we received Tk {{amount}} at {{clinic}}. Total paid Tk {{totalPaid}}.{{followUp}} Thank you.";

type SmsPatient = { id: number; name: string; patientNo: string; phone: string | null };
type SmsResult = { status: "sent" | "skipped" | "failed"; reason?: string };

const fmtDate = (ymd: string) => ymd.split("-").reverse().join("/");
const n = (x: number) => x.toLocaleString("en-US");

async function clinicName() {
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { nameEn: true } });
    return org?.nameEn || "Dental Care";
}

const renderFollowUpSms = (patient: SmsPatient, clinic: string, ymd: string) =>
    FOLLOW_UP_SMS.replaceAll("{{patientName}}", patient.name)
        .replaceAll("{{patientNo}}", patient.patientNo)
        .replaceAll("{{clinic}}", clinic)
        .replaceAll("{{date}}", fmtDate(ymd));

// Everything collected from the patient, less refunds
export async function totalCollected(patientId: number) {
    const rows = await db.payment.groupBy({ by: ["type"], where: { patientId }, _sum: { paidAmount: true } });
    return rows.reduce((n, r) => n + (r.type === "REFUND" ? -1 : 1) * Number(r._sum.paidAmount || 0), 0);
}

// Whether this SMS may go to the patient: a mobile number, enough collected in all, then enough SMS balance for
// it (asked only when the rest pass). reason says why not; null when it may.
async function smsCheck(patient: SmsPatient, body: string, collected?: number) {
    const total = collected ?? (await totalCollected(patient.id));
    const raw = adnMobile(patient.phone || "");
    const mobile = validMobile(raw) ? raw : null;
    const smsNeeded = smsInfo(body).parts;

    let reason: string | null = null;
    let balance: number | null = null;
    if (!mobile) reason = "the patient has no valid mobile number.";
    else if (total < smsMinCollected) reason = `collected ৳${n(total)}, below ৳${n(smsMinCollected)}.`;
    else {
        const b = await gatewaySmsBalance();
        balance = b.balance;
        if (b.balance == null) reason = `the SMS balance couldn't be checked (${b.error}).`;
        else if (b.balance < smsNeeded) reason = `not enough SMS balance (${n(Math.max(0, b.balance))} left, this needs ${smsNeeded}).`;
    }
    return { totalCollected: total, smsMinCollected, mobile, smsBalance: balance, smsNeeded, smsEligible: reason === null, reason };
}

// The follow-up SMS check for a new date (YYYY-MM-DD; any date while none is picked, they're all as long)
export async function followUpSmsCheck(patient: SmsPatient, ymd = "2000-01-01") {
    const body = renderFollowUpSms(patient, await clinicName(), ymd);
    return { ...(await smsCheck(patient, body)), body };
}

// The patient behind /patient/{objectId}/patient-visit, with what the prescription page shows about the SMS
export async function loadVisit(objectId: string) {
    const patient = await db.patient.findUnique({
        where: { objectId },
        select: { id: true, objectId: true, patientNo: true, name: true, phone: true },
    });
    if (!patient) return null;
    const [withAgreement] = await withRunningAgreement([patient]);
    const { body, ...check } = await followUpSmsCheck(patient);
    return { patient, hasAgreement: !!withAgreement.agreement, ...check };
}

// One SMS through the ThinkTech ERP gateway, as Bulk SMS sends; logged under Notifications
async function sendSms(patientId: number, mobile: string, body: string, subject: string): Promise<SmsResult> {
    const sent = await sendGatewaySms([mobile], body);
    const error = sent.ok ? null : sent.error;
    const messageId = sent.ok ? sent.messageId : null;
    await db.notification.create({
        data: {
            patientId, channel: "SMS", recipient: mobile, body,
            subject: `${subject}${messageId ? " · " + messageId : ""}`,
            status: error ? "FAILED" : "SENT", sentAt: error ? null : new Date(), error,
        },
    });
    return error ? { status: "failed", reason: error } : { status: "sent" };
}

// Texts the new follow-up date (YYYY-MM-DD); "skipped" with the reason when it may not go
export async function sendFollowUpSms(patientId: number, date: string): Promise<SmsResult> {
    const patient = await db.patient.findUnique({ where: { id: patientId }, select: { id: true, name: true, patientNo: true, phone: true } });
    if (!patient) return { status: "skipped", reason: "patient not found." };
    const check = await followUpSmsCheck(patient, date);
    if (!check.smsEligible || !check.mobile) return { status: "skipped", reason: check.reason || undefined };
    return sendSms(patient.id, check.mobile, check.body, "Next follow-up");
}

// Texts a collection just saved: the amount, the total paid and the case's next follow-up date when one is set.
// "skipped" with the reason when it may not go (e.g. the total paid is still below the threshold).
export async function sendCollectionSms(paymentId: number): Promise<SmsResult> {
    const payment = await db.payment.findUnique({
        where: { id: paymentId },
        select: {
            paidAmount: true,
            patient: { select: { id: true, name: true, patientNo: true, phone: true } },
            caseHistory: { select: { followUpDate: true } },
        },
    });
    if (!payment) return { status: "skipped", reason: "collection not found." };
    const patient = payment.patient;
    const collected = await totalCollected(patient.id);
    const followUp = payment.caseHistory?.followUpDate?.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const body = COLLECTION_SMS.replaceAll("{{patientName}}", patient.name)
        .replaceAll("{{patientNo}}", patient.patientNo)
        .replaceAll("{{clinic}}", await clinicName())
        .replaceAll("{{amount}}", n(Number(payment.paidAmount)))
        .replaceAll("{{totalPaid}}", n(collected))
        .replaceAll("{{followUp}}", followUp && followUp >= today ? ` Next follow-up: ${fmtDate(followUp)}.` : "");

    const check = await smsCheck(patient, body, collected);
    if (!check.smsEligible || !check.mobile) return { status: "skipped", reason: check.reason || undefined };
    return sendSms(patient.id, check.mobile, body, "Collection");
}
