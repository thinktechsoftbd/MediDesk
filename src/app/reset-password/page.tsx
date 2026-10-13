"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input, Label, Button } from "@/components/ui";
import { Loader2, KeyRound, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import AuthShell from "@/components/auth-shell";

export default function ResetPassword() {
    const [token, setToken] = useState("");
    const [state, setState] = useState<"checking" | "valid" | "invalid" | "done">("checking");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const t = new URLSearchParams(window.location.search).get("token") || "";
        setToken(t);
        fetch(`/api/password/reset?token=${encodeURIComponent(t)}`)
            .then(async (r) => {
                const d = await r.json().catch(() => null);
                if (r.ok) {
                    setEmail(d?.email || "");
                    setState("valid");
                } else setState("invalid");
            })
            .catch(() => setState("invalid"));
    }, []);

    const submit = async (e: any) => {
        e.preventDefault();
        setError("");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("The two passwords do not match.");
        setLoading(true);
        const r = await fetch("/api/password/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
        });
        const d = await r.json().catch(() => null);
        setLoading(false);
        if (!r.ok) setError(d?.error || "Could not change the password.");
        else setState("done");
    };

    return (
        <AuthShell subtitle="Set a new password">
            {state === "checking" && (
                <div className="flex justify-center py-6 text-slate-500">
                    <Loader2 className="animate-spin" />
                </div>
            )}

            {state === "invalid" && (
                <div className="space-y-3 text-center">
                    <XCircle size={40} className="mx-auto text-red-500" />
                    <p className="text-sm text-slate-600">This reset link is invalid or has expired.</p>
                    <Link href="/forgot-password" className="text-sm font-medium text-teal-700 hover:underline">
                        Request a new link
                    </Link>
                </div>
            )}

            {state === "done" && (
                <div className="space-y-4 text-center">
                    <CheckCircle2 size={40} className="mx-auto text-teal-600" />
                    <p className="text-sm text-slate-600">Your password has been changed.</p>
                    <Link href="/login">
                        <Button className="w-full">Sign in</Button>
                    </Link>
                </div>
            )}

            {state === "valid" && (
                <form className="space-y-4" onSubmit={submit}>
                    {email && <p className="text-sm text-slate-600">Account: <b>{email}</b></p>}
                    <div>
                        <Label required>New Password</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                    </div>
                    <div>
                        <Label required>Confirm Password</Label>
                        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button className="w-full disabled:opacity-70" disabled={loading}>
                        {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <KeyRound size={16} className="mr-2" />}
                        {loading ? "Saving..." : "Change password"}
                    </Button>
                </form>
            )}

            {state !== "done" && (
                <div className="mt-5 text-center">
                    <Link href="/login" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
                        <ArrowLeft size={14} /> Back to sign in
                    </Link>
                </div>
            )}
        </AuthShell>
    );
}
