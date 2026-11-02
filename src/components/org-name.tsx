"use client";
import { useEffect, useState } from "react";

// Renders the active organization's name, loaded from the database (same source as the
// sidebar/topbar branding). Shows the fallback until it loads or if none is configured.
export default function OrgName({ fallback = "MediDesk" }: { fallback?: string }) {
    const [name, setName] = useState("");

    useEffect(() => {
        fetch("/api/organization/active")
            .then((r) => r.json())
            .then((d) => {
                if (d?.nameEn) setName(d.nameEn);
            })
            .catch(() => {});
    }, []);

    return <>{name || fallback}</>;
}
