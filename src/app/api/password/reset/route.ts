import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

async function findValid(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const row: any = await db.passwordResetToken.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
    if (!row || row.usedAt || row.expiresAt < new Date() || row.user.status !== "ACTIVE") return null;
    return row;
}

// GET ?token= : is the link still valid?
export async function GET(req: Request) {
    const token = new URL(req.url).searchParams.get("token") || "";
    const row = await findValid(token);
    return row ? ok({ valid: true, email: row.user.email }) : bad("This reset link is invalid or has expired.", 400);
}

// POST { token, password } : set the new password and use up the link
export async function POST(req: Request) {
    const b = await parseBody(req);
    const password = String(b?.password || "");
    if (password.length < 6) return bad("Password must be at least 6 characters.");
    const row = await findValid(String(b?.token || ""));
    if (!row) return bad("This reset link is invalid or has expired. Request a new one.");

    await db.$transaction([
        db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
        // this link and any other open links for the account stop working
        db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return ok({ message: "Password changed. You can sign in now." });
}
