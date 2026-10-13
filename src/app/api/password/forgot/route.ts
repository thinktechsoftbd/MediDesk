import crypto from "crypto";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody } from "@/lib/api";
import { sendEmail } from "@/lib/messaging";

export const dynamic = "force-dynamic";

const TTL_MINUTES = 30;
const DONE = "If that email belongs to an account, a reset link has been sent. Check your inbox.";

// Email a one-time reset link. The reply is the same whether or not the
// email exists, so the form cannot be used to find accounts.
export async function POST(req: Request) {
    const b = await parseBody(req);
    const email = String(b?.email || "").trim().toLowerCase();
    if (!email) return bad("Enter your email address.");
    if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.example.com")
        return bad("Password reset by email is not set up yet. Please ask the administrator to reset your password.", 503);

    const user: any = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "ACTIVE" } });
    if (!user) return ok({ message: DONE });

    // at most 3 links per 15 minutes per account
    const recent = await db.passwordResetToken.count({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    if (recent >= 3) return ok({ message: DONE });

    const token = crypto.randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
        },
    });

    const base = (process.env.NEXTAUTH_URL || new URL(req.url).origin).replace(/\/+$/, "");
    const link = `${base}/reset-password?token=${token}`;
    const org = await db.organization.findFirst({ where: { isActive: true }, orderBy: { id: "asc" } });
    const clinic = org?.nameEn || "Dental Care";

    try {
        await sendEmail(
            user.email,
            `${clinic}: reset your password`,
            `<p>Hello ${user.name},</p>
             <p>We received a request to reset your password for ${clinic}.</p>
             <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0d9488;color:#fff;border-radius:8px;text-decoration:none">Reset password</a></p>
             <p>Or open this link: <br>${link}</p>
             <p>The link works once and expires in ${TTL_MINUTES} minutes. If you did not ask for this, you can ignore this email.</p>`
        );
    } catch (e: any) {
        console.error("Reset email failed:", e);
        return bad("Could not send the reset email. Please try again later or ask the administrator.", 502);
    }
    return ok({ message: DONE });
}
