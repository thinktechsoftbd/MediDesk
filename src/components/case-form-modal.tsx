"use client";
import { useEffect, useState } from "react";
import { Input, Label, Button, Textarea, Modal, SearchSelect } from "@/components/ui";
import { X, Save, Plus, Trash2, Printer } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyMed = { medicineId: "", dosage: "", duration: "", instructions: "" };

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
    medicines: [] as any[],
};

export default function CaseFormModal({
    open,
    onClose,
    onSaved,
    caseData,
    fixedPatientId,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: (saved?: any) => void;
    caseData?: any | null;
    fixedPatientId?: string;
}) {
    const [patients, setPatients] = useState<any[]>([]);
    const [medicineList, setMedicineList] = useState<any[]>([]);
    const [f, setF] = useState<any>(empty);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!fixedPatientId) {
            fetch("/api/patients")
                .then((r) => r.json())
                .then(setPatients);
        }
        fetch("/api/medicines")
            .then((r) => r.json())
            .then((d) => setMedicineList(Array.isArray(d) ? d : []));
    }, [fixedPatientId]);

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
                medicines: [],
            });

            // prefill the medicines from the case's prescription
            fetch(`/api/cases/${caseData.id}`)
                .then((r) => r.json())
                .then((full) => {
                    const items =
                        full?.prescriptions?.flatMap((pr: any) => pr.items) ||
                        [];
                    if (items.length) {
                        setF((prev: any) => ({
                            ...prev,
                            medicines: items.map((m: any) => ({
                                medicineId: String(m.medicineId),
                                dosage: m.dosage === "-" ? "" : m.dosage,
                                duration: m.duration === "-" ? "" : m.duration,
                                instructions: m.instructions || "",
                            })),
                        }));
                    }
                })
                .catch(() => {});
        } else {
            setF({
                ...empty,
                patientId: fixedPatientId || "",
                caseDate: toYMD(new Date()),
                medicines: [],
            });
        }
    }, [open, caseData, fixedPatientId]);

    const setMed = (i: number, k: string, v: string) => {
        const medicines = [...f.medicines];
        medicines[i] = { ...medicines[i], [k]: v };
        setF({ ...f, medicines });
    };

    const save = async (e: any, print = false) => {
        e.preventDefault();
        if (saving) return;

        if (f.medicines.some((m: any) => !m.medicineId)) {
            toast.error("Pick a medicine for every line, or remove empty lines.");
            return;
        }

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

        if (print && saved?.id) {
            window.open(`/api/cases/${saved.id}/prescription/pad`, "_blank");
        }

        onClose();
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
                        onChange={(e) =>
                            setF({ ...f, toothNumber: e.target.value })
                        }
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

                    <Input
                        value={f.oe}
                        onChange={(e) => setF({ ...f, oe: e.target.value })}
                        placeholder="On examination findings"
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

                {/* Prescription medicines */}
                <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between border-b pb-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                            Prescription Medicines
                        </span>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                                setF({
                                    ...f,
                                    medicines: [
                                        ...f.medicines,
                                        { ...emptyMed },
                                    ],
                                })
                            }
                        >
                            <Plus size={15} className="mr-1.5" />
                            Medicine
                        </Button>
                    </div>

                    {f.medicines.length === 0 && (
                        <p className="py-2 text-xs text-slate-500">
                            No medicines added. Use + Medicine to add lines
                            for the printed prescription.
                        </p>
                    )}

                    {f.medicines.map((m: any, i: number) => (
                        <div
                            key={i}
                            className="mt-2 rounded-xl bg-slate-50 p-3"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                    Medicine {i + 1}
                                </span>

                                <button
                                    type="button"
                                    className="text-red-600"
                                    onClick={() =>
                                        setF({
                                            ...f,
                                            medicines: f.medicines.filter(
                                                (_: any, j: number) => j !== i
                                            ),
                                        })
                                    }
                                    title="Remove medicine"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <SearchSelect
                                options={medicineList.map((md: any) => ({
                                    value: String(md.id),
                                    label: `${md.name}${md.strength ? ` ${md.strength} ${md.unit || ""}` : ""}${md.dosageForm ? ` (${md.dosageForm})` : ""}`,
                                }))}
                                value={m.medicineId}
                                onChange={(v) => setMed(i, "medicineId", v)}
                                placeholder="Search medicine..."
                                required
                            />

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Dosage (e.g. 1+0+1)"
                                    value={m.dosage}
                                    onChange={(e) =>
                                        setMed(
                                            i,
                                            "dosage",
                                            e.target.value.replace(/ +/g, "+")
                                        )
                                    }
                                />

                                <Input
                                    placeholder="Duration (e.g. 7 days)"
                                    value={m.duration}
                                    onChange={(e) =>
                                        setMed(i, "duration", e.target.value)
                                    }
                                />
                            </div>

                            <Input
                                className="mt-2"
                                placeholder="Instructions (e.g. after meal)"
                                value={m.instructions}
                                onChange={(e) =>
                                    setMed(i, "instructions", e.target.value)
                                }
                            />
                        </div>
                    ))}
                </div>

                <div className="sm:col-span-2">
                    <Label>Remarks</Label>

                    <Textarea
                        value={f.details}
                        onChange={(e) =>
                            setF({ ...f, details: e.target.value })
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

                        <Button
                            type="button"
                            disabled={saving}
                            onClick={(e: any) => save(e, true)}
                        >
                            <Printer size={16} className="mr-1.5" />
                            Save &amp; Generate Prescription
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
