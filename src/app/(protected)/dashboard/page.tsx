"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import PatientSearch from "@/components/patient-search";
import PageLoader from "@/components/page-loader";
import { useCan } from "@/components/permissions-context";

export default function Dashboard() {
    const can = useCan();
    const [d, setD] = useState<any>();

    useEffect(() => {
        fetch("/api/dashboard")
            .then((r) => r.json())
            .then(setD);
    }, []);

    if (!d) return <PageLoader />;

    const stats = [
        ["Active Patients", d.patients],
        ["Case Histories", d.cases],
        ["Prescriptions", d.prescriptions],
        ["Today's Appointments", d.todayAppointments],
        ["Today's Collection", `৳ ${d.todayCollection.toFixed(2)}`],
    ];

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>

                    <p className="text-sm text-slate-500">
                        Overview of Mohonto Dental Care
                    </p>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <PatientSearch className="w-full sm:w-96" />

                    {can("PATIENT.C") && (
                        <Link
                            href="/patients?new=1"
                            className="btn btn-primary flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                        >
                            <UserPlus size={16} />
                            New Patient
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {stats.map(([a, b]) => {
                    const card = (
                        <Card className="h-full p-5">
                            <div className="text-sm text-slate-500">{a}</div>

                            <div className="mt-2 text-2xl font-bold">{b}</div>
                        </Card>
                    );
                    return a === "Today's Appointments" ? (
                        <Link
                            key={a as string}
                            href="/follow-ups"
                            className="block transition hover:-translate-y-0.5"
                            title="Open Next Follow-up list"
                        >
                            {card}
                        </Link>
                    ) : (
                        <div key={a as string}>{card}</div>
                    );
                })}
            </div>

            <Card className="mt-6 p-5">
                <div className="mb-4 flex justify-between">
                    <h2 className="font-semibold">Recent Patients</h2>

                    <Badge>Live</Badge>
                </div>

                <div className="divide-y">
                    {d.recentPatients.map((p: any) => (
                        <div
                            key={p.id}
                            className="flex justify-between py-3 text-sm"
                        >
                            <span>{p.name}</span>

                            <span className="text-slate-500">{p.phone}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
