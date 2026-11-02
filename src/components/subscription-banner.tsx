"use client";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";
import { canSee } from "@/lib/menu-access";
import { PermissionsContext } from "./permissions-context";
import SubscriptionExpiredModal from "./subscription-expired-modal";
import type { SubscriptionStatus } from "@/lib/thinktech-erp";

// warn this many days before the subscription's last day
const WARN_DAYS = 15;
const ORG_PAGE = "/security/organization";
const DISMISS_KEY = "subscription-alert-dismissed";

// "2026-11-15" -> "15 Nov 2026"
function longDate(ymd: string) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Alert above every page when the clinic's ThinkTech ERP subscription is ending soon, or can't be
// checked because the organization isn't in the ERP; when it is not active, a popup that blocks the
// app instead. Nothing when it is fine, when no ERP is configured or when the ERP can't be reached
// (the app keeps working).
export default function SubscriptionBanner() {
    const [check, setCheck] = useState<SubscriptionStatus | null>(null);
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

    // not active: every action is blocked until it is renewed
    if (check?.status === "checked" && !check.isValid) {
        return <SubscriptionExpiredModal reason={check.reason} renewUrl={check.renewUrl ?? null} />;
    }

    let alert: { text: string; key: string; orgLink?: boolean } | null = null;
    if (check?.status === "checked" && check.validUntil && check.daysRemaining != null && check.daysRemaining <= WARN_DAYS) {
        const when =
            check.daysRemaining === 0 ? "today" : check.daysRemaining === 1 ? "tomorrow" : `in ${check.daysRemaining} days`;
        alert = {
            text: `Your MediDesk subscription ends ${when} (${longDate(check.validUntil)}). Contact ThinkTech to renew it in time.`,
            key: `ends:${check.validUntil}`,
        };
    } else if (check?.status === "unregistered") {
        alert = {
            text: "This clinic isn't registered in ThinkTech ERP, so its subscription can't be checked.",
            key: "unregistered",
            orgLink: canSee(ORG_PAGE, perms),
        };
    }
    if (!alert || alert.key === dismissed) return null;

    const dismiss = () => {
        setDismissed(alert!.key);
        try {
            sessionStorage.setItem(DISMISS_KEY, alert!.key);
        } catch {}
    };

    return (
        <div
            role="status"
            className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
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
            <button
                type="button"
                onClick={dismiss}
                className="rounded p-0.5 opacity-60 hover:opacity-100"
                aria-label="Dismiss"
                title="Hide until the next sign-in"
            >
                <X size={16} />
            </button>
        </div>
    );
}
