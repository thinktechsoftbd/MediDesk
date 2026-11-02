"use client";
import { useEffect, useRef } from "react";
import { ExternalLink, LogOut, TriangleAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { subscriptionInactiveMessage } from "@/lib/subscription-message";

// Over every page while the clinic's ThinkTech ERP subscription is not active. It is a modal <dialog>,
// so the page behind is inert (nothing there can be clicked or typed in), and it can't be dismissed:
// Escape is refused and, should the browser close it anyway (a repeated Escape), it opens again.
// Removing it (e.g. in the browser's developer tools) doesn't help either: the server refuses every
// add/edit/delete meanwhile (src/middleware.ts).
// Renew subscription opens ThinkTech's pricing page in a new tab; Sign out is the way out.
export default function SubscriptionExpiredModal({ reason, renewUrl }: { reason: string | null; renewUrl: string | null }) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        const open = () => {
            if (!dialog.open) dialog.showModal();
        };
        const refuse = (e: Event) => e.preventDefault();
        dialog.addEventListener("cancel", refuse);
        dialog.addEventListener("close", open);
        open();
        return () => {
            dialog.removeEventListener("cancel", refuse);
            dialog.removeEventListener("close", open);
            if (dialog.open) dialog.close();
        };
    }, []);

    return (
        <dialog
            ref={ref}
            aria-labelledby="subscription-expired-title"
            aria-describedby="subscription-expired-text"
            className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
        >
            <div className="p-7 sm:p-10">
                <h2 id="subscription-expired-title" className="text-2xl font-semibold">
                    Subscription not active
                </h2>
                <div
                    id="subscription-expired-text"
                    role="alert"
                    className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-lg leading-relaxed text-red-800"
                >
                    <TriangleAlert size={26} className="mt-0.5 shrink-0" />
                    <p>{subscriptionInactiveMessage(reason)}</p>
                </div>
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        className="btn-secondary gap-2 px-6 py-3 text-base"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        <LogOut size={20} />
                        Sign out
                    </button>
                    {renewUrl && (
                        <a href={renewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary gap-2 px-6 py-3 text-base">
                            <ExternalLink size={20} />
                            Renew subscription
                        </a>
                    )}
                </div>
            </div>
        </dialog>
    );
}
