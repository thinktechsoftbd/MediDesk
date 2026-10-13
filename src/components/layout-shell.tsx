"use client";
import { useEffect, useState } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import Footer from "./footer";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { canSee } from "@/lib/menu-access";
import { PermissionsContext } from "./permissions-context";

export default function LayoutShell({
    children,
}: {
    children: React.ReactNode;
}) {
    // desktop: collapsed hides the sidebar and content takes full width
    const [collapsed, setCollapsed] = useState(false);

    // mobile: sidebar slides in as an overlay drawer
    const [mobileOpen, setMobileOpen] = useState(false);

    // organization branding, loaded from the database
    const [org, setOrg] = useState<any>(null);

    // effective permission codes of the signed-in user (null while loading)
    const [perms, setPerms] = useState<string[] | null>(null);
    const path = usePathname();

    useEffect(() => {
        fetch("/api/me/permissions")
            .then((r) => r.json())
            .then((d) => setPerms(Array.isArray(d?.codes) ? d.codes : []))
            .catch(() => setPerms([]));
    }, [path]);

    const allowed = perms === null || canSee(path, perms);

    useEffect(() => {
        fetch("/api/organization/active")
            .then((r) => r.json())
            .then(setOrg)
            .catch(() => {});
    }, []);

    const toggleSidebar = () => {
        if (window.innerWidth >= 1024) {
            setCollapsed((c) => !c);
        } else {
            setMobileOpen((o) => !o);
        }
    };

    return (
        <PermissionsContext.Provider value={perms}>
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onNavigate={() => setMobileOpen(false)}
                org={org}
                perms={perms}
            />

            {/* mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <Topbar
                collapsed={collapsed}
                onToggleSidebar={toggleSidebar}
                org={org}
            />

            <main
                className={`min-h-screen pt-16 transition-all duration-200 ${
                    collapsed ? "" : "lg:ml-64"
                }`}
            >
                <div className="flex min-h-[calc(100vh-4rem)] flex-col p-4 md:p-6">
                    <div className="flex-1">
                        {allowed ? (
                            children
                        ) : (
                            <div className="card mx-auto mt-16 max-w-md p-8 text-center">
                                <ShieldOff size={36} className="mx-auto mb-3 text-slate-400" />
                                <h2 className="text-lg font-semibold">No permission</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Your role does not have access to this page.
                                </p>
                            </div>
                        )}
                    </div>

                    <Footer />
                </div>
            </main>
        </PermissionsContext.Provider>
    );
}
