"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

// A confirmation in the app's own style, instead of the browser's confirm(). Escape or Cancel closes it
// (not while busy); clicking outside doesn't, as with Modal.
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Confirm",
    danger,
    busy,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: React.ReactNode;
    message: React.ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="card w-full max-w-md p-5">
                <div className="flex items-start gap-3">
                    <div className={`shrink-0 rounded-full p-2 ${danger ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-700"}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 id="confirm-title" className="font-semibold">
                            {title}
                        </h2>
                        <div className="mt-1 text-sm text-slate-600">{message}</div>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        autoFocus
                        className={danger ? "btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" : "btn-primary disabled:opacity-60"}
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {busy && <Loader2 size={15} className="mr-1.5 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
