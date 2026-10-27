"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard, Users, ClipboardList, CalendarClock, Mail, MessageSquareText,
    Wallet, Settings, ShieldCheck, ChevronDown, type LucideIcon,
} from "lucide-react";
import { canSee } from "@/lib/menu-access";

type LinkItem = [string, string];
type Group = { title: string; links: LinkItem[] };
type Section = { title: string; icon: LucideIcon; match: string[]; groups: Group[] };

const mainItems: [string, string, LucideIcon][] = [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["Patients", "/patients", Users],
    ["Case History", "/cases/list", ClipboardList],
    ["Next Follow-up", "/follow-ups", CalendarClock],
    ["Greetings", "/greetings", Mail],
    ["Bulk SMS", "/sms", MessageSquareText],
];

// parent menu -> collapsible sub groups -> links
const sections: Section[] = [
    {
        title: "Payments & Accounting",
        icon: Wallet,
        match: ["/accounting", "/payments"],
        groups: [
            { title: "Master Data", links: [["Chart of Accounts", "/accounting/chart-of-accounts"]] },
            { title: "Transactions", links: [["Bill Collection", "/payments"], ["Journal Vouchers", "/accounting/vouchers"]] },
            {
                title: "Report",
                links: [
                    ["Bill Collections", "/accounting/reports/bill-collections"],
                    ["Subsidiary Ledger", "/accounting/reports/patient-ledger"],
                    ["Trial Balance", "/accounting/reports/trial-balance"],
                    ["Balance Sheet", "/accounting/reports/balance-sheet"],
                ],
            },
        ],
    },
    {
        title: "Settings",
        icon: Settings,
        match: ["/settings"],
        groups: [{ title: "", links: [["Medicines", "/settings/medicines"], ["Oral Examination (O/E)", "/settings/oral-exam"], ["Clinical Terms", "/settings/clinical-terms"]] }],
    },
    {
        title: "Security",
        icon: ShieldCheck,
        match: ["/security"],
        groups: [
            {
                title: "",
                links: [
                    ["Organization", "/security/organization"],
                    ["User", "/security/users"],
                    ["User Role", "/security/user-roles"],
                    ["Role", "/security/roles"],
                    ["Permission", "/security/permissions"],
                ],
            },
        ],
    },
];

const isUnder = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
    return (
        <ChevronDown
            size={small ? 14 : 16}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
    );
}

// child links hanging off a curved tree line
function TreeLinks({ links, path, onNavigate }: { links: LinkItem[]; path: string; onNavigate: () => void }) {
    return (
        <ul className="menu-tree">
            {links.map(([name, href]) => {
                const active = isUnder(path, href);
                return (
                    <li key={href}>
                        <Link
                            href={href}
                            onClick={onNavigate}
                            className={`block truncate rounded-lg px-3 py-2 text-sm transition-colors ${
                                active ? "bg-teal-50 font-semibold text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            {name}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Sidebar({
    collapsed,
    mobileOpen,
    onNavigate,
    onExpand,
    org,
    perms,
}: {
    collapsed: boolean;
    mobileOpen: boolean;
    onNavigate: () => void;
    onExpand: () => void;
    org?: any;
    perms: string[] | null;
}) {
    const path = usePathname();

    // only what the signed-in user has permission for
    const visibleMain = mainItems.filter(([, href]) => canSee(href, perms));
    const visibleSections = sections
        .map((s) => ({
            ...s,
            groups: s.groups
                .map((g) => ({ ...g, links: g.links.filter(([, href]) => canSee(href, perms)) }))
                .filter((g) => g.links.length > 0),
        }))
        .filter((s) => s.groups.length > 0);

    // open state per section and per sub group; the active page's ones start open
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        const o: Record<string, boolean> = {};
        for (const s of sections) {
            o[s.title] = s.match.some((m) => path.startsWith(m));
            for (const g of s.groups) if (g.title) o[`${s.title}/${g.title}`] = g.links.some(([, h]) => isUnder(path, h));
        }
        return o;
    });
    const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

    // desktop collapsed = an icon rail: a section's icon opens the sidebar with that section open
    const rail = (cls: string) => (collapsed ? cls : "");
    const clickSection = (k: string) => {
        if (collapsed && window.innerWidth >= 1024) {
            onExpand();
            setOpen((o) => ({ ...o, [k]: true }));
        } else toggle(k);
    };

    const rowBase = "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm leading-snug transition-colors";
    const railRow = rail("lg:justify-center lg:gap-0 lg:px-0");

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-30 flex w-[17rem] flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:inset-y-3 lg:left-3 lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-sm ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            } ${rail("lg:w-[4.5rem]")}`}
        >
            {/* brand: same height and border as the top bar; the T mark alone on the rail */}
            <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 px-4 ${rail("lg:justify-center lg:px-0")}`}>
                <Link href="/dashboard" className="block min-w-0" title="Go to dashboard">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/medidesk-logo.svg" alt="MediDesk - A Software For Health" className={`h-14 w-auto ${rail("lg:hidden")}`} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/medidesk-mark.svg" alt="MediDesk" className={`hidden h-10 w-10 ${rail("lg:block")}`} />
                </Link>
            </div>

            <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
                {visibleMain.map(([name, href, Icon]) => {
                    const active = isUnder(path, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onNavigate}
                            title={collapsed ? name : undefined}
                            className={`${rowBase} ${railRow} ${
                                active ? "bg-teal-50 font-semibold text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <Icon size={18} className="shrink-0" />
                            <span className={`truncate ${rail("lg:hidden")}`}>{name}</span>
                        </Link>
                    );
                })}

                {visibleSections.map((s) => {
                    const active = s.match.some((m) => path.startsWith(m));
                    const isOpen = !!open[s.title];
                    return (
                        <div key={s.title}>
                            <button
                                type="button"
                                onClick={() => clickSection(s.title)}
                                title={collapsed ? s.title : undefined}
                                className={`${rowBase} ${railRow} ${
                                    active ? `text-teal-700 ${rail("lg:bg-teal-50")}` : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                                aria-expanded={isOpen}
                            >
                                <s.icon size={18} className="shrink-0" />
                                <span className={`min-w-0 flex-1 ${rail("lg:hidden")}`}>{s.title}</span>
                                <span className={rail("lg:hidden")}>
                                    <Chevron open={isOpen} />
                                </span>
                            </button>

                            {isOpen && (
                                <div className={`mb-1 ml-[19px] mt-0.5 ${rail("lg:hidden")}`}>
                                    {s.groups.length === 1 && !s.groups[0].title ? (
                                        // single unnamed group: links hang straight off the parent
                                        <TreeLinks links={s.groups[0].links} path={path} onNavigate={onNavigate} />
                                    ) : (
                                        <ul className="menu-tree">
                                            {s.groups.map((g) => {
                                                const key = `${s.title}/${g.title}`;
                                                const gOpen = !!open[key];
                                                const gActive = g.links.some(([, h]) => isUnder(path, h));
                                                return (
                                                    <li key={key}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggle(key)}
                                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${
                                                                gActive ? "text-teal-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                                            }`}
                                                            aria-expanded={gOpen}
                                                        >
                                                            <span className="flex-1 truncate">{g.title}</span>
                                                            <Chevron open={gOpen} small />
                                                        </button>
                                                        {gOpen && (
                                                            <div className="ml-3">
                                                                <TreeLinks links={g.links} path={path} onNavigate={onNavigate} />
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}
