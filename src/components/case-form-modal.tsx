"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Button, Textarea, Modal, SearchSelect } from "@/components/ui";
import OePicker from "@/components/oe-picker";
import ToothChart from "@/components/tooth-chart";
import { dir } from "@/lib/medicine-label";
import { X, Save, Pill } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// medicines are written on the prescription page (/cases/[id]/prescription), not here;
// the case body has no `medicines`, so saving a case leaves its Rx alone
const empty = {
    patientId: "",
    toothNumber: "",
    bp: "",
    oe: "",
    followUpDate: "",
    problem: "",
    treatment: "",
    details: "",
    caseDate: "",
    status: "IN_PROGRESS",
};

export default function CaseFormModal({
    open,
    onClose,
    onSaved,
    caseData,
    fixedPatientId,
    fromRx,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: (saved?: any) => void;
    caseData?: any | null;
    fixedPatientId?: string;
    // opened from the prescription page: no "write prescription" button
    fromRx?: boolean;
}) {
    const router = useRouter();
    const [patients, setPatients] = useState<any[]>([]);
    const [f, setF] = useState<any>(empty);
    // patient shown read-only when the patient is fixed (edit / from patient page)
    const [patientInfo, setPatientInfo] = useState<any>(null);
    // O/E master list; remarks typed after picking an O/E update its default remarks
    const [oeList, setOeList] = useState<any[]>([]);
    const [remarksTouched, setRemarksTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!fixedPatientId) {
            fetch("/api/patients")
                .then((r) => r.json())
                .then(setPatients);
        }
    }, [fixedPatientId]);

    useEffect(() => {
        if (!open) return;
        setRemarksTouched(false);
        fetch("/api/oral-exam-diseases")
            .then((r) => r.json())
            .then((d) => setOeList(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const pid = caseData?.patientId || fixedPatientId;
        if (caseData?.patient) setPatientInfo(caseData.patient);
        else if (pid) {
            setPatientInfo(null);
            fetch(`/api/patients/${pid}`)
                .then((r) => r.json())
                .then((p) => p?.id && setPatientInfo(p))
                .catch(() => {});
        } else setPatientInfo(null);
    }, [open, caseData, fixedPatientId]);

    useEffect(() => {
        if (!open) return;
        if (caseData) {
            setF({
                patientId: String(caseData.patientId),
                toothNumber: caseData.toothNumber || "",
                bp: caseData.bp || "",
                oe: caseData.oe || "",
                followUpDate: caseData.followUpDate?.slice(0, 10) || "",
                problem: caseData.problem || "",
                treatment: caseData.treatment || "",
                details: caseData.details || "",
                caseDate: caseData.caseDate?.slice(0, 10) || "",
                status:
                    caseData.status === "CLOSED" ? "CLOSED" : "IN_PROGRESS",
            });
        } else {
            setF({
                ...empty,
                patientId: fixedPatientId || "",
                caseDate: toYMD(new Date()),
            });
        }
    }, [open, caseData, fixedPatientId]);

    // new case: O/E defaults to Pulpitis (with its default remarks)
    useEffect(() => {
        if (!open || caseData || !oeList.length) return;
        const d = oeList.find((x: any) => String(x.diseaseName).trim().toLowerCase() === "pulpitis");
        if (!d) return;
        setF((prev: any) => (prev.oe ? prev : { ...prev, oe: d.diseaseName, details: prev.details || d.remarks || "" }));
    }, [open, caseData, oeList]);

    const save = async (e: any, writeRx = false) => {
        e.preventDefault();
        if (saving) return;

        setSaving(true);

        const res = await fetch(
            caseData ? `/api/cases/${caseData.id}` : "/api/cases",
            {
                method: caseData ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(f),
            }
        );

        const saved = await res.json().catch(() => null);
        setSaving(false);

        if (!res.ok) {
            toast.error(saved?.error || "Failed to save case.");
            return;
        }

        toast.success(caseData ? "Case updated" : "Case history saved");

        // remarks changed for a listed O/E: save them as that O/E's default remarks
        const oeRow = oeList.find((o) => o.diseaseName.trim().toLowerCase() === String(f.oe || "").trim().toLowerCase());
        if (oeRow && remarksTouched && dir(f.details) !== dir(oeRow.remarks)) {
            const r = await fetch(`/api/oral-exam-diseases/${oeRow.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ remarks: f.details }),
            });
            if (r.ok) toast.success(`Default remarks updated for "${oeRow.diseaseName}"`);
            else toast.error((await r.json().catch(() => null))?.error || "Failed to update O/E remarks.");
        }

        onClose();
        if (writeRx && saved?.id) {
            router.push(`/cases/${saved.id}/prescription`);
            return;
        }
        onSaved(saved);
    };

    return (
        <Modal
            wide
            open={open}
            title={
                caseData
                    ? `Update Case-${String(caseData.caseNo).padStart(2, "0")}`
                    : "New Case History"
            }
            onClose={onClose}
        >
            <form
                onSubmit={save}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
                {(fixedPatientId || caseData) && (
                    <div className="sm:col-span-2">
                        <Label>Patient</Label>
                        <div className="input flex items-center gap-2 bg-slate-50">
                            {patientInfo ? (
                                <>
                                    <span className="font-medium">{patientInfo.name}</span>
                                    <span className="text-sm text-slate-500">
                                        ({patientInfo.patientNo}){patientInfo.phone ? ` · ${patientInfo.phone}` : ""}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-slate-400">Loading patient...</span>
                            )}
                        </div>
                    </div>
                )}

                {!fixedPatientId && !caseData && (
                    <div className="sm:col-span-2">
                        <Label required>Patient</Label>

                        <SearchSelect
                            options={patients.map((p) => ({
                                value: String(p.id),
                                label: `${p.name} — ${p.phone}`,
                            }))}
                            value={f.patientId}
                            onChange={(v) => setF({ ...f, patientId: v })}
                            placeholder="Search patient by name or phone..."
                            required
                        />
                    </div>
                )}

                <div>
                    <Label>Case No</Label>

                    <Input
                        value={
                            caseData
                                ? `Case-${String(caseData.caseNo).padStart(2, "0")}`
                                : "Auto generated"
                        }
                        readOnly
                        className="bg-slate-50 text-slate-500"
                    />
                </div>

                <div>
                    <Label>Case Date</Label>

                    <DatePicker
                        selected={f.caseDate ? new Date(f.caseDate) : null}
                        onChange={(d: Date | null) =>
                            setF({ ...f, caseDate: d ? toYMD(d) : "" })
                        }
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        className="input"
                        wrapperClassName="w-full"
                        isClearable
                    />
                </div>

                <div>
                    <Label>Tooth Number</Label>

                    <Input
                        value={f.toothNumber}
                        readOnly
                        className="bg-slate-50"
                        placeholder="Tick teeth in Tooth Selection"
                    />
                </div>

                <div>
                    <Label>B/P</Label>

                    <Input
                        value={f.bp}
                        onChange={(e) => setF({ ...f, bp: e.target.value })}
                        placeholder="e.g. 120/80"
                    />
                </div>

                <div>
                    <Label>O/E</Label>

                    <OePicker
                        value={f.oe}
                        options={oeList}
                        onChange={(text) => setF({ ...f, oe: text })}
                        onPick={(d) => {
                            // fill the case Remarks from the O/E default remarks
                            setF({ ...f, oe: d.diseaseName, details: d.remarks || f.details });
                            setRemarksTouched(false);
                        }}
                    />
                </div>

                <div>
                    <Label>Next Follow-up Date</Label>

                    <DatePicker
                        selected={
                            f.followUpDate ? new Date(f.followUpDate) : null
                        }
                        onChange={(d: Date | null) =>
                            setF({ ...f, followUpDate: d ? toYMD(d) : "" })
                        }
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        className="input"
                        wrapperClassName="w-full"
                        minDate={new Date()}
                        isClearable
                    />
                </div>

                <div className="sm:col-span-2">
                    <Label>Tooth Selection</Label>
                    <ToothChart
                        value={f.toothNumber}
                        onChange={(text) => setF({ ...f, toothNumber: text })}
                        child={(caseData?.ageGroup || patientInfo?.ageGroup) === "CHILD"}
                    />
                </div>

                <div className="sm:col-span-2">
                    <Label>Adv / Remarks</Label>

                    <Textarea
                        value={f.details}
                        onChange={(e) => {
                            setF({ ...f, details: e.target.value });
                            setRemarksTouched(true);
                        }}
                    />
                </div>

                <div className="sm:col-span-2">
                    <Label>Problem</Label>

                    <Textarea
                        value={f.problem}
                        onChange={(e) =>
                            setF({ ...f, problem: e.target.value })
                        }
                    />
                </div>

                <div className="sm:col-span-2">
                    <Label>Treatment</Label>

                    <Textarea
                        value={f.treatment}
                        onChange={(e) =>
                            setF({ ...f, treatment: e.target.value })
                        }
                    />
                </div>

                <div className="flex flex-col gap-3 border-t pt-3 sm:col-span-2">
                    <div className="flex items-center gap-4">
                        <Label>Status</Label>

                        <div className="flex items-center gap-5">
                            {[
                                ["IN_PROGRESS", "In Progress"],
                                ["CLOSED", "Closed"],
                            ].map(([val, label]) => (
                                <label
                                    key={val}
                                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                                >
                                    <input
                                        type="radio"
                                        name="caseStatus"
                                        value={val}
                                        checked={f.status === val}
                                        onChange={() =>
                                            setF({ ...f, status: val })
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                            >
                                <X size={16} className="mr-1.5" />
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={saving}
                                className={
                                    caseData
                                        ? "!bg-amber-500 hover:!bg-amber-600"
                                        : ""
                                }
                            >
                                <Save size={16} className="mr-1.5" />
                                {caseData ? "Update" : "Save"}
                            </Button>
                        </div>

                        {!fromRx && (
                            <Button
                                type="button"
                                disabled={saving}
                                onClick={(e: any) => save(e, true)}
                            >
                                <Pill size={16} className="mr-1.5" />
                                Save &amp; Write Prescription
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}
