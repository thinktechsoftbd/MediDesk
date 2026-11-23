"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui";
import { PermissionsContext } from "@/components/permissions-context";

// /patient/{objectId}/patient-visit opens the patient's prescription page, as picking them in the patient search
// does: their open case (or a new one for today); first the Update Patient popup when they have no running
// service charge agreement. The next follow-up date and its SMS are set there.
export default function PatientVisit({ params }: { params: { objectId: string } }) {
    const router = useRouter();
    const codes = useContext(PermissionsContext);
    const [error, setError] = useState("");
    const started = useRef(false);

    useEffect(() => {
        // wait for the permissions, and open only once
        if (codes === null || started.current) return;
        started.current = true;
        (async () => {
            const r = await fetch(`/api/patient-visit/${encodeURIComponent(params.objectId)}`);
            const v = await r.json().catch(() => null);
            if (!r.ok) return setError(v?.error || "Could not load the patient.");
            const p = v.patient;
            if (!v.hasAgreement && codes.includes("PATIENT.E")) return router.replace(`/patients?edit=${p.id}&rx=1`);

            const rx = await fetch(`/api/patients/${p.id}/rx-case`, { method: "POST" });
            const d = await rx.json().catch(() => null);
            if (rx.ok && d?.id) {
                if (d.created) toast.success(`New case opened for ${p.name}`);
                router.replace(`/cases/${d.id}/${p.objectId}/prescription`);
            } else {
                if (!rx.ok) toast.error(d?.error || "Could not open the prescription.");
                else toast("No open case, and you may not open one. Showing the case history.", { icon: "ℹ️" });
                router.replace(`/cases/patient/${p.id}`);
            }
        })();
    }, [codes, params.objectId, router]);

    if (error)
        return (
            <Card className="p-8 text-center text-slate-500">
                {error}{" "}
                <Link href="/patient-visit" className="text-teal-700 hover:underline">
                    Find another patient
                </Link>
            </Card>
        );
    return (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Opening the prescription...
        </div>
    );
}
