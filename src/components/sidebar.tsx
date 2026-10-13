"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { canSee } from "@/lib/menu-access";

const items = [
    ["Dashboard", "/dashboard", "▦"],
    ["Patients", "/patients", "◉"],
    ["Case History", "/cases/list", "▤"],
    ["Next Follow-up", "/follow-ups", "℞"],
    ["Greetings", "/greetings", "✉"],
    ["Bulk SMS", "/sms", "✆"],
];

// Payments & Accounting -> sub groups -> links
const accountingGroups: [string, [string, string][]][] = [
    ["Master Data", [
        ["Chart of Accounts", "/accounting/chart-of-accounts"],
    ]],
    ["Transactions", [
        ["Bill Collection", "/payments"],
        ["Journal Vouchers", "/accounting/vouchers"],
    ]],
    ["Report", [
        ["Bill Collections", "/accounting/reports/bill-collections"],
        ["Subsidiary Ledger", "/accounting/reports/patient-ledger"],
        ["Trial Balance", "/accounting/reports/trial-balance"],
        ["Balance Sheet", "/accounting/reports/balance-sheet"],
    ]],
];

const settingsItems = [
    ["Medicines", "/settings/medicines"],
];

const securityItems = [
    ["Organization", "/security/organization"],
    ["User", "/security/users"],
    ["User Role", "/security/user-roles"],
    ["Role", "/security/roles"],
    ["Permission", "/security/permissions"],
];

export default function Sidebar({
    collapsed,
    mobileOpen,
    onNavigate,
    org,
    perms,
}: {
    collapsed: boolean;
    mobileOpen: boolean;
    onNavigate: () => void;
    org?: any;
    perms: string[] | null;
}) {
    const path = usePathname();

    // only menus the signed-in user has permission for
    const mainItems = items.filter(([, href]) => canSee(href, perms));
    const accGroups = accountingGroups
        .map(([g, links]) => [g, links.filter(([, href]) => canSee(href, perms))] as [string, [string, string][]])
        .filter(([, links]) => links.length > 0);
    const showSecurity = canSee("/security", perms);

    const isSecurityActive = path.startsWith("/security");

    const [securityOpen, setSecurityOpen] =
        useState(isSecurityActive);

    const isAccountingActive =
        path.startsWith("/accounting") || path.startsWith("/payments");

    const [accountingOpen, setAccountingOpen] =
        useState(isAccountingActive);

    const isSettingsActive = path.startsWith("/settings");

    const [settingsOpen, setSettingsOpen] =
        useState(isSettingsActive);

    return (
        <aside
            className={`
                fixed
                inset-y-0
                left-0
                z-30
                flex
                w-64
                flex-col
                border-r
                bg-white
                transition-transform
                duration-200
                ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                ${collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}
            `}
        >
            {/* =====================================================
                HEADER
            ====================================================== */}
            <div
                className="
                    flex
                    h-16
                    shrink-0
                    items-center
                    border-b
                    px-6
                "
            >
                <Link href="/dashboard" className="block rounded-lg hover:opacity-80" title="Go to dashboard">
                    <div className="font-bold text-teal-700">
                        {org?.nameEn || "Mohonto Dental Care"}
                    </div>

                    <div className="text-xs text-slate-500">
                        {org?.slogan || "Clinic Management"}
                    </div>
                </Link>
            </div>

            {/* =====================================================
                SCROLLABLE NAVIGATION
            ====================================================== */}
            <nav
                className="
                    sidebar-scroll
                    flex-1
                    space-y-1
                    overflow-y-auto
                    overflow-x-hidden
                    p-3
                "
            >
                {/* =================================================
                    MAIN MENUS
                ================================================== */}
                {mainItems.map(([name, href, icon]) => {
                    const isActive = path === href;

                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onNavigate}
                            className={`
                                flex
                                items-center
                                gap-3
                                rounded-xl
                                px-4
                                py-3
                                text-sm
                                transition-colors
                                ${
                                    isActive
                                        ? "bg-teal-50 font-semibold text-teal-700"
                                        : "text-slate-600 hover:bg-slate-50"
                                }
                            `}
                        >
                            <span className="w-5 text-center">
                                {icon}
                            </span>

                            <span>
                                {name}
                            </span>
                        </Link>
                    );
                })}

                {accGroups.length > 0 && (<>
                {/* =================================================
                    PAYMENTS & ACCOUNTING PARENT MENU
                ================================================== */}
                <button
                    type="button"
                    onClick={() =>
                        setAccountingOpen((current) => !current)
                    }
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-xl
                        px-4
                        py-3
                        text-sm
                        transition-colors
                        ${
                            isAccountingActive
                                ? "bg-teal-50 font-semibold text-teal-700"
                                : "text-slate-600 hover:bg-slate-50"
                        }
                    `}
                >
                    <span className="flex items-center gap-3">
                        <span className="w-5 text-center">
                            ৳
                        </span>

                        <span>
                            Payments &amp; Accounting
                        </span>
                    </span>

                    <span
                        className={`
                            text-xs
                            transition-transform
                            duration-200
                            ${
                                accountingOpen
                                    ? "rotate-180"
                                    : ""
                            }
                        `}
                    >
                        ▼
                    </span>
                </button>

                {/* =================================================
                    PAYMENTS & ACCOUNTING SUB GROUPS
                ================================================== */}
                {accountingOpen && (
                    <div
                        className="
                            ml-4
                            space-y-1
                            border-l
                            border-slate-200
                            pl-3
                        "
                    >
                        {accGroups.map(([group, links]) => (
                            <div key={group}>
                                <div className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    {group}
                                </div>

                                {links.map(([name, href]) => {
                                    const isActive = path === href;

                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={onNavigate}
                                            className={`
                                                flex
                                                items-center
                                                rounded-lg
                                                px-4
                                                py-2.5
                                                text-sm
                                                transition-colors
                                                ${
                                                    isActive
                                                        ? "bg-teal-50 font-semibold text-teal-700"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                }
                                            `}
                                        >
                                            {name}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                </>)}

                {/* =================================================
                    SETTINGS PARENT MENU
                ================================================== */}
                <button
                    type="button"
                    onClick={() =>
                        setSettingsOpen((current) => !current)
                    }
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-xl
                        px-4
                        py-3
                        text-sm
                        transition-colors
                        ${
                            isSettingsActive
                                ? "bg-teal-50 font-semibold text-teal-700"
                                : "text-slate-600 hover:bg-slate-50"
                        }
                    `}
                >
                    <span className="flex items-center gap-3">
                        <span className="w-5 text-center">
                            ⚙
                        </span>

                        <span>
                            Settings
                        </span>
                    </span>

                    <span
                        className={`
                            text-xs
                            transition-transform
                            duration-200
                            ${
                                settingsOpen
                                    ? "rotate-180"
                                    : ""
                            }
                        `}
                    >
                        ▼
                    </span>
                </button>

                {/* =================================================
                    SETTINGS SUB MENU
                ================================================== */}
                {settingsOpen && (
                    <div
                        className="
                            ml-4
                            space-y-1
                            border-l
                            border-slate-200
                            pl-3
                        "
                    >
                        {settingsItems.map(([name, href]) => {
                            const isActive = path === href;

                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={onNavigate}
                                    className={`
                                        flex
                                        items-center
                                        rounded-lg
                                        px-4
                                        py-2.5
                                        text-sm
                                        transition-colors
                                        ${
                                            isActive
                                                ? "bg-teal-50 font-semibold text-teal-700"
                                                : "text-slate-600 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    {name}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {showSecurity && (<>
                {/* =================================================
                    SECURITY PARENT MENU
                ================================================== */}
                <button
                    type="button"
                    onClick={() =>
                        setSecurityOpen((current) => !current)
                    }
                    className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-xl
                        px-4
                        py-3
                        text-sm
                        transition-colors
                        ${
                            isSecurityActive
                                ? "bg-teal-50 font-semibold text-teal-700"
                                : "text-slate-600 hover:bg-slate-50"
                        }
                    `}
                >
                    <span className="flex items-center gap-3">
                        <span className="w-5 text-center">
                            ⚿
                        </span>

                        <span>
                            Security
                        </span>
                    </span>

                    <span
                        className={`
                            text-xs
                            transition-transform
                            duration-200
                            ${
                                securityOpen
                                    ? "rotate-180"
                                    : ""
                            }
                        `}
                    >
                        ▼
                    </span>
                </button>

                {/* =================================================
                    SECURITY SUB MENUS
                ================================================== */}
                {securityOpen && (
                    <div
                        className="
                            ml-4
                            space-y-1
                            border-l
                            border-slate-200
                            pl-3
                        "
                    >
                        {securityItems.map(([name, href]) => {
                            const isActive = path === href;

                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={onNavigate}
                                    className={`
                                        flex
                                        items-center
                                        rounded-lg
                                        px-4
                                        py-2.5
                                        text-sm
                                        transition-colors
                                        ${
                                            isActive
                                                ? "bg-teal-50 font-semibold text-teal-700"
                                                : "text-slate-600 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    {name}
                                </Link>
                            );
                        })}
                    </div>
                )}
                </>)}
            </nav>
        </aside>
    );
}