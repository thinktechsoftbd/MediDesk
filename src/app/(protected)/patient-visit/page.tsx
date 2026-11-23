"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ChevronRight } from "lucide-react";
import { Card, Input } from "@/components/ui";

// Patient Visit menu: find the patient, then /patient/{objectId}/patient-visit opens their prescription page
export default function PatientVisitSearch() {
    const [q, setQ] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // debounced; the most recently updated patients while the box is empty
    useEffect(() => {
        setLoading(true);
        const t = setTimeout(() => {
            fetch(`/api/patients?q=${encodeURIComponent(q.trim())}&page=1&pageSize=15`)
                .then((r) => r.json())
                .then((d) => setItems(d.items || []))
                .catch(() => setItems([]))
                .finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Patient Visit</h1>
                <p className="text-sm text-slate-500">Find the patient to open their prescription and next follow-up.</p>
            </div>

            <Card className="p-5">
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        autoFocus
                        className="pl-9"
                        placeholder="Search patient by name, phone or patient no..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <ul className="divide-y">
                    {items.map((p) => (
                        <li key={p.id}>
                            <Link
                                href={`/patient/${encodeURIComponent(p.objectId)}/patient-visit`}
                                className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">{p.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {p.patientNo} · {p.phone || "no phone"}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="shrink-0 text-slate-400" />
                            </Link>
                        </li>
                    ))}
                </ul>

                {loading && (
                    <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" /> Searching...
                    </div>
                )}
                {!loading && items.length === 0 && (
                    <div className="p-6 text-center text-sm text-slate-500">No patient found</div>
                )}
            </Card>
        </div>
    );
}
