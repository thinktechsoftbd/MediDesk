"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Card, Input, Label, Button } from "@/components/ui";
import { Loader2, LogIn } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: any) => {
        e.preventDefault();
        if (loading) return;
        setError("");
        setLoading(true);

        const r = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (r?.ok) {
            // full navigation so the fresh session cookie is used;
            // client-side router cache would replay the pre-login redirect
            window.location.href = "/dashboard";
        } else {
            setError("Invalid email or password.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-4">
            <Card className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <div className="text-2xl font-bold text-teal-700">
                        Mohonto Dental Care
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        Sign in to clinic management
                    </p>
                </div>

                <form className="space-y-4" onSubmit={submit}>
                    <div>
                        <Label required>Email</Label>

                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <Label required>Password</Label>
                            <Link href="/forgot-password" className="text-xs text-teal-700 hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <Input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <Button
                        className="w-full disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    size={16}
                                    className="mr-2 animate-spin"
                                />
                                Logging in...
                            </>
                        ) : (
                            <>
                                <LogIn size={16} className="mr-2" />
                                Sign in
                            </>
                        )}
                    </Button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-400">
                    © {new Date().getFullYear()} ThinkTech. All Rights
                    Reserved. | Powered by ThinkTech
                </p>
            </Card>
        </div>
    );
}
