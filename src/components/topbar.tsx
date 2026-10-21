"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PatientSearch from "./patient-search";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, LogOut, User, Search, X } from "lucide-react";

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

    // global patient search: icon in the top bar, also Ctrl+K / Cmd+K
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const path = usePathname();
    // a pick can stay on the same page with a new query (/patients?edit=...)
    const query = useSearchParams().toString();

    useEffect(() => setSearchOpen(false), [path, query]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen((o) => !o);
            } else if (e.key === "Escape") setSearchOpen(false);
        };
        const onDoc = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        window.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDoc);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onDoc);
        };
    }, []);

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
            className={`fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 transition-all duration-200 lg:right-3 lg:top-3 lg:rounded-2xl lg:border lg:shadow-sm ${
                collapsed ? "lg:left-3" : "lg:left-[18.5rem]"
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
                <div className="relative" ref={searchRef}>
                    <button
                        type="button"
                        onClick={() => setSearchOpen((o) => !o)}
                        className={`rounded-full p-2 transition-colors ${
                            searchOpen ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
                        }`}
                        title="Search patient (Ctrl+K)"
                        aria-label="Search patient"
                    >
                        <Search size={20} />
                    </button>

                    {searchOpen && (
                        <div className="fixed left-2 right-2 top-[4.25rem] z-50 rounded-xl border bg-white p-3 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[28rem]">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">Search Patient</span>
                                <button
                                    type="button"
                                    className="rounded p-1 text-slate-400 hover:text-slate-600"
                                    onClick={() => setSearchOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <PatientSearch autoFocus />
                            <p className="mt-2 text-xs text-slate-400">
                                Click a patient to write a prescription, or use the icons for a new bill collection, collections and case history.
                            </p>
                        </div>
                    )}
                </div>

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
