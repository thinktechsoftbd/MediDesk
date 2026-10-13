"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import DashboardView from "@/components/dashboard-view";
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

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

            <DashboardView d={d} />
        </div>
    );
}
