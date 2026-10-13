"use client";
import { useState } from "react";
import Link from "next/link";
import { Input, Label, Button } from "@/components/ui";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import AuthShell from "@/components/auth-shell";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState("");

    const submit = async (e: any) => {
        e.preventDefault();
        if (loading) return;
        setError("");
        setLoading(true);
        const r = await fetch("/api/password/forgot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const d = await r.json().catch(() => null);
        setLoading(false);
        if (!r.ok) setError(d?.error || "Something went wrong. Try again.");
        else setDone(d?.message || "Check your inbox for the reset link.");
    };

    return (
        <AuthShell subtitle="Forgot your password?">
            {done ? (
                <div className="space-y-4 text-center">
                    <CheckCircle2 size={40} className="mx-auto text-teal-600" />
                    <p className="text-sm text-slate-600">{done}</p>
                    <p className="text-xs text-slate-500">The link expires in 30 minutes.</p>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={submit}>
                    <p className="text-sm text-slate-600">
                        Enter the email you sign in with. We&apos;ll send you a link to set a new password.
                    </p>
                    <div>
                        <Label required>Email</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button className="w-full disabled:cursor-not-allowed disabled:opacity-70" disabled={loading}>
                        {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Mail size={16} className="mr-2" />}
                        {loading ? "Sending..." : "Send reset link"}
                    </Button>
                </form>
            )}
            <div className="mt-5 text-center">
                <Link href="/login" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
                    <ArrowLeft size={14} /> Back to sign in
                </Link>
            </div>
        </AuthShell>
    );
}
