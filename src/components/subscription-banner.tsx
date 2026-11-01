"use client";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";
import { canSee } from "@/lib/menu-access";
import { PermissionsContext } from "./permissions-context";
import type { SubscriptionCheck } from "@/lib/thinktech-erp";

// warn this many days before the subscription's last day
const WARN_DAYS = 15;
const ORG_PAGE = "/security/organization";
const DISMISS_KEY = "subscription-alert-dismissed";

// "2026-11-15" -> "15 Nov 2026"
function longDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Alert above every page when the clinic's ThinkTech ERP subscription is ending soon, is not
// active, or can't be checked because the organization isn't in the ERP. Nothing when it is fine,
// when no ERP is configured or when the ERP can't be reached (the app keeps working).
export default function SubscriptionBanner() {
    const [check, setCheck] = useState<SubscriptionCheck | null>(null);
    // the warning hidden for this browser session; a later warning shows again
    const [dismissed, setDismissed] = useState<string | null>(null);
    const perms = useContext(PermissionsContext);

    useEffect(() => {
        try {
            setDismissed(sessionStorage.getItem(DISMISS_KEY));
        } catch {}
        fetch("/api/subscription")
            .then((r) => (r.ok ? r.json() : null))
            .then(setCheck)
            .catch(() => {});
    }, []);

    let alert: { error: boolean; text: string; key?: string; orgLink?: boolean } | null = null;
    if (check?.status === "checked" && !check.isValid) {
        alert = {
            error: true,
            text: `Your MediDesk subscription is not active. ${check.reason || ""} Contact ThinkTech to renew it.`,
        };
    } else if (check?.status === "checked" && check.validUntil && check.daysRemaining != null && check.daysRemaining <= WARN_DAYS) {
        const when =
            check.daysRemaining === 0 ? "today" : check.daysRemaining === 1 ? "tomorrow" : `in ${check.daysRemaining} days`;
        alert = {
            error: false,
            text: `Your MediDesk subscription ends ${when} (${longDate(check.validUntil)}). Contact ThinkTech to renew it in time.`,
            key: `ends:${check.validUntil}`,
        };
    } else if (check?.status === "unregistered") {
        alert = {
            error: false,
            text: "This clinic isn't registered in ThinkTech ERP, so its subscription can't be checked.",
            key: "unregistered",
            orgLink: canSee(ORG_PAGE, perms),
        };
    }
    if (!alert || (alert.key && alert.key === dismissed)) return null;

    const dismiss = () => {
        setDismissed(alert!.key!);
        try {
            sessionStorage.setItem(DISMISS_KEY, alert!.key!);
        } catch {}
    };

    return (
        <div
            role={alert.error ? "alert" : "status"}
            className={`mb-3 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                alert.error ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
        >
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
                {alert.text}
                {alert.orgLink && (
                    <>
                        {" "}
                        <Link href={ORG_PAGE} className="font-medium underline hover:no-underline">
                            Save it on Security &gt; Organization
                        </Link>{" "}
                        to register it.
                    </>
                )}
            </div>
            {alert.key && (
                <button
                    type="button"
                    onClick={dismiss}
                    className="rounded p-0.5 opacity-60 hover:opacity-100"
                    aria-label="Dismiss"
                    title="Hide until the next sign-in"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
