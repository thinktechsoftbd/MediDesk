// Which permission code a page needs. Paths without an entry are open to any signed-in user.
export const PAGE_PERMISSIONS: [string, string][] = [
    ["/dashboard", "DASHBOARD.V"],
    ["/patients", "PATIENT.V"],
    ["/cases", "CASE.V"],
    ["/follow-ups", "CASE.V"],
    ["/prescriptions", "PRESCRIPTION.V"],
    ["/greetings", "GREETING.V"],
    ["/sms", "GREETING.V"],
    ["/payments", "PAYMENT.V"],
    ["/accounting", "PAYMENT.V"],
    ["/security", "SECURITY.V"],
];

export function permissionFor(path: string): string | null {
    const hit = PAGE_PERMISSIONS.find(([p]) => path === p || path.startsWith(p + "/"));
    return hit ? hit[1] : null;
}

// null codes = still loading -> treat as not allowed so menus don't flash
export function canSee(path: string, codes: string[] | null): boolean {
    const need = permissionFor(path);
    if (!need) return true;
    return !!codes && codes.includes(need);
}
