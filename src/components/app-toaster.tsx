"use client";

import { Toaster, toast, resolveValue } from "react-hot-toast";
import { CheckCircle2, XCircle, Info, Loader2, X } from "lucide-react";

// Bootstrap-style alert notifications (success / danger / info), top-right.
const look: Record<string, { box: string; title: string; Icon: any }> = {
    success: { box: "border-[#badbcc] bg-[#d1e7dd] text-[#0f5132]", title: "Success", Icon: CheckCircle2 },
    error: { box: "border-[#f5c2c7] bg-[#f8d7da] text-[#842029]", title: "Error", Icon: XCircle },
    loading: { box: "border-[#b6effb] bg-[#cff4fc] text-[#055160]", title: "Please wait", Icon: Loader2 },
    blank: { box: "border-[#b6effb] bg-[#cff4fc] text-[#055160]", title: "Notice", Icon: Info },
};

export default function AppToaster() {
    return (
        <Toaster position="top-right" toastOptions={{ duration: 3500 }}>
            {(t) => {
                const l = look[t.type] || look.blank;
                return (
                    <div
                        role="alert"
                        className={`pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-md border px-4 py-3 shadow-md transition-all duration-200 ${l.box} ${
                            t.visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                        }`}
                    >
                        <l.Icon size={20} className={`mt-0.5 shrink-0 ${t.type === "loading" ? "animate-spin" : ""}`} />
                        <div className="min-w-0 flex-1 text-sm">
                            <div className="font-semibold">{l.title}</div>
                            <div className="mt-0.5 break-words">{resolveValue(t.message, t)}</div>
                        </div>
                        {t.type !== "loading" && (
                            <button
                                type="button"
                                onClick={() => toast.dismiss(t.id)}
                                className="-mr-1 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                );
            }}
        </Toaster>
    );
}
