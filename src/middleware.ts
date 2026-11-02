import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { subscriptionInactiveMessage } from "@/lib/subscription-message";

// Requests that change data. While the clinic's ThinkTech ERP subscription is not active they are refused,
// so the popup that blocks the app can't be got around (e.g. by removing it in the developer tools).
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Add/edit/delete on the API needs an active subscription; reading, and signing in and out, stay open.
// The answer comes from GET /api/subscription (which reuses the ERP's answer for 5 minutes). When it can't
// say (no session, no ERP configured, the ERP unreachable), the request goes through as before.
async function guardWrites(req: NextRequest) {
    if (!WRITE_METHODS.has(req.method) || req.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();
    try {
        const res = await fetch(new URL("/api/subscription", req.nextUrl.origin), {
            headers: { cookie: req.headers.get("cookie") ?? "" },
            cache: "no-store",
        });
        const check: any = res.ok ? await res.json() : null;
        if (check?.status === "checked" && check.isValid === false)
            return NextResponse.json({ error: subscriptionInactiveMessage(check.reason) }, { status: 403 });
    } catch {}
    return NextResponse.next();
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    if (req.nextUrl.pathname.startsWith("/api/")) return guardWrites(req);
    // pages need a signed-in user
    return withAuth(req as NextRequestWithAuth, event);
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/patients/:path*",
        "/cases/:path*",
        "/prescriptions/:path*",
        "/payments/:path*",
        "/greetings/:path*",
        "/security/:path*",
        "/accounting/:path*",
        "/settings/:path*",
        "/profile/:path*",
        "/follow-ups/:path*",
        "/sms/:path*",
        "/print/:path*",
        "/api/:path*",
    ],
};
