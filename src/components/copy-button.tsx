"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";

// navigator.clipboard needs HTTPS or localhost; the textarea fallback covers a clinic LAN on plain HTTP
async function copyText(text: string) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
        if (!document.execCommand("copy")) throw new Error("copy failed");
    } finally {
        area.remove();
    }
}

export default function CopyButton({ text, title = "Copy" }: { text: string; title?: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await copyText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Could not copy. Select the text and copy it instead.");
        }
    };

    return (
        <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
            onClick={copy}
            title={copied ? "Copied" : title}
            aria-label={title}
        >
            {copied ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
        </button>
    );
}
