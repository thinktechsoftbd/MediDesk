"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, LogOut, User } from "lucide-react";

export default function Topbar({
    collapsed,
    onToggleSidebar,
    org,
}: {
    collapsed: boolean;
    onToggleSidebar: () => void;
    org?: any;
}) {
    const [me, setMe] = useState<any>(null);

    useEffect(() => {
        const loadMe = () =>
            fetch("/api/profile")
                .then((r) => (r.ok ? r.json() : null))
                .then(setMe)
                .catch(() => {});
        loadMe();
        window.addEventListener("profile-updated", loadMe);
        return () => window.removeEventListener("profile-updated", loadMe);
    }, []);

    return (
        <header
            className={`fixed right-0 top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 transition-all duration-200 left-0 ${
                collapsed ? "" : "lg:left-64"
            }`}
        >
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>

                <Link href="/dashboard" className="block rounded-lg hover:opacity-80" title="Go to dashboard">
                    <div className="font-semibold">
                        {org?.nameEn || "Mohonto Dental Care"}
                    </div>

                    <div className="text-xs text-slate-500">
                        {org?.slogan || "Dental Clinic Management System"}
                    </div>
                </Link>
            </div>

            <div className="flex items-center gap-3">
                <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-slate-100"
                    title="My profile"
                >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-teal-700">
                        {me?.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={me.photoUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : me?.name ? (
                            <span className="text-sm font-semibold">
                                {me.name.charAt(0).toUpperCase()}
                            </span>
                        ) : (
                            <User size={16} />
                        )}
                    </span>

                    <span className="hidden text-sm font-medium sm:block">
                        {me?.name || "Profile"}
                    </span>
                </Link>

                <button
                    className="btn-secondary"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut size={16} className="mr-1.5" />
                    Sign out
                </button>
            </div>
        </header>
    );
}
