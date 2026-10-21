
"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Textarea, Modal, Pagination } from "@/components/ui";
import { Plus, Search, X, UserPlus, Save, Pencil, ChevronLeft, ChevronRight, FolderOpen, Trash2, ReceiptText, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useCan } from "@/components/permissions-context";
import AgreementPanel, { tk, closeAgreement, collectionHistoryUrl } from "@/components/agreement-panel";
import PhotoUpload from "@/components/photo-upload";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// yyyy-mm-dd from a Date, using local time so the day never shifts
const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// age in whole years from a yyyy-mm-dd date of birth
const ageFromDob = (ymd: string) => {
    const b = new Date(ymd);
    if (isNaN(b.getTime())) return "";
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a >= 0 ? String(a) : "";
};

// dob = current date minus the given age in years
const dobFromAge = (age: string) => {
    const n = Number(age);
    if (!age.trim() || isNaN(n) || n < 0 || n > 150) return "";
    const t = new Date();
    t.setFullYear(t.getFullYear() - Math.floor(n));
    return toYMD(t);
};

// dd/mm/yyyy for display
const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};
const empty = {
    name: "",
    age: "",
    phone: "",
    email: "",
    address: "",
    gender: "",
    ageGroup: "ADULT",
    bloodGroup: "",
    serviceCharge: "",
    agreementDetails: "",
    photoUrl: "",
    dateOfBirth: "",
    admissionDate: "",
    followUpDate: "",
    notes: "",
};

const fields: { key: string; label: string; type: string }[] = [
    { key: "name", label: "Full Name", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "age", label: "Age", type: "text" },
    { key: "dateOfBirth", label: "Date Of Birth", type: "date" },
    { key: "gender", label: "Gender", type: "radio" },
    { key: "ageGroup", label: "Adult / Child", type: "radio" },
    { key: "bloodGroup", label: "Blood Group", type: "select" },
    { key: "admissionDate", label: "Admission Date", type: "date" },
    { key: "followUpDate", label: "Next Follow-up Date", type: "date" },
    { key: "serviceCharge", label: "Total Agreement Charge", type: "number" },
    { key: "photoUrl", label: "Patient Photo", type: "photo" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "agreementDetails", label: "Agreement Details", type: "textarea" },
    { key: "notes", label: "Remarks", type: "textarea" },
];

// agreement fields are typed for a new patient, or on Update when no agreement is running;
// otherwise editing uses the agreement panel
const NEW_ONLY = ["serviceCharge", "agreementDetails"];
// saved on the case the popup opens (new patient, or Update from patient search), not on the patient
const CASE_ONLY = ["followUpDate"];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const selectOptions: Record<string, { value: string; label: string }[]> = {
    gender: [
        { value: "MALE", label: "Male" },
        { value: "FEMALE", label: "Female" },
        { value: "OTHER", label: "Other" },
    ],
    ageGroup: [
        { value: "ADULT", label: "Adult" },
        { value: "CHILD", label: "Child" },
    ],
    bloodGroup: bloodGroups.map((b) => ({ value: b, label: b })),
};

export default function Patients() {
    const [loading, setLoading] = useState(true);
    const can = useCan();
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [genderFilter, setGenderFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [form, setForm] = useState<any>(empty);
    const [editing, setEditing] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    // the patient being edited has a running agreement (null: not known yet)
    const [hasAgreement, setHasAgreement] = useState<boolean | null>(null);
    // opened from patient search for a patient with no agreement: after Update, a new case's prescription
    const [rxAfter, setRxAfter] = useState(false);
    const [saving, setSaving] = useState(false);

    const removePatient = async (p: any) => {
        if (!confirm(`Delete patient ${p.name} (${p.patientNo})?`)) return;
        const r = await fetch(`/api/patients/${p.id}`, { method: "DELETE" });
        if (r.ok) {
            toast.success("Patient deleted");
            load();
        } else {
            toast.error((await r.json().catch(() => null))?.error || "Failed to delete patient.", { duration: 6000 });
        }
    };

    const load = (
        gender = genderFilter,
        from = dateFrom,
        to = dateTo,
        pg = page,
        ps = pageSize
    ) => {
        const params = new URLSearchParams({
            q,
            page: String(pg),
            pageSize: String(ps),
        });
        if (gender) params.set("gender", gender);
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);
        setLoading(true);
        fetch("/api/patients?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                setItems(d.items || []);
                setTotal(d.total);
            })
            .finally(() => setLoading(false));
    };

    const search = (
        gender = genderFilter,
        from = dateFrom,
        to = dateTo
    ) => {
        setPage(1);
        load(gender, from, to, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load(genderFilter, dateFrom, dateTo, pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(genderFilter, dateFrom, dateTo, 1, ps);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // from patient search, also while this page is open: ?new=1&name=..., ?edit=<id>
    // (patient details), ?edit=<id>&rx=1 (no agreement yet: Update, then a new case's prescription)
    const query = useSearchParams().toString();
    useEffect(() => {
        const sp = new URLSearchParams(query);
        if (sp.get("new") === "1") {
            setEditing(null);
            setForm({
                ...empty,
                name: sp.get("name") || "",
                admissionDate: new Date().toISOString().slice(0, 10),
            });
            setModalOpen(true);
            window.history.replaceState(null, "", "/patients");
        }
        // ?edit=<id>&rx=1: Update Patient popup, then a new case's prescription
        const editId = Number(sp.get("edit"));
        if (editId) {
            const rx = sp.get("rx") === "1";
            window.history.replaceState(null, "", "/patients");
            fetch(`/api/patients/${editId}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((p) => (p ? openEdit(p, rx) : toast.error("Patient not found.")))
                .catch(() => toast.error("Could not load the patient."));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const openNew = () => {
        setEditing(null);
        setForm({
            ...empty,
            admissionDate: new Date().toISOString().slice(0, 10),
        });
        setModalOpen(true);
    };

    // p: a list row (running agreement in p.agreement) or GET /api/patients/[id] (all p.agreements)
    const openEdit = (p: any, rx = false) => {
        setEditing(p.id);
        setHasAgreement(p.agreement !== undefined ? !!p.agreement : (p.agreements || []).some((a: any) => a.isClosed === "N"));
        setRxAfter(rx);
        // only the form's own fields, nulls as "" (inputs must not get null)
        setForm({
            ...Object.fromEntries(Object.keys(empty).map((k) => [k, p[k] ?? ""])),
            age: p.age || "",
            bloodGroup: p.bloodGroup || "",
            // patients saved before Adult / Child existed show Adult
            ageGroup: p.ageGroup || "ADULT",
            photoUrl: p.photoUrl || "",
            dateOfBirth: p.dateOfBirth?.slice(0, 10) || "",
            admissionDate: p.admissionDate?.slice(0, 10) || "",
            serviceCharge: "",
            agreementDetails: "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setHasAgreement(null);
        setRxAfter(false);
        setForm(empty);
    };

    // a new case for today (with the next follow-up typed on the popup), then its prescription page
    const openNewCaseRx = async (patientId: number, followUpDate: string) => {
        const r = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId, caseDate: toYMD(new Date()), status: "IN_PROGRESS", followUpDate: followUpDate || null }),
        });
        const c = await r.json().catch(() => null);
        if (r.ok && c?.id) router.push(`/cases/${c.id}/prescription`);
        else {
            toast.error(c?.error || "Patient saved, but a new case could not be opened.");
            router.push(`/cases/patient/${patientId}`);
        }
    };

    // the agreement fields are on the form: new patient, or an update with no running agreement
    const agreementInForm = !editing || hasAgreement === false;
    // Save opens a case: new patient, or Update from patient search
    const caseInForm = can("CASE.C") && (!editing || rxAfter);

    const save = async (e: any) => {
        e.preventDefault();
        if (saving) return;

        // optional for a new patient (no agreement is opened); the Update popup from patient
        // search is there to enter it, so that one still asks
        if (rxAfter && !Number(form.serviceCharge)) {
            if (!confirm("Total Agreement Charge is empty, so no agreement will be opened. Continue?"))
                return;
        }
        setSaving(true);
        try {
            await submit();
        } finally {
            setSaving(false);
        }
    };

    const submit = async () => {
        const res = await fetch(
            editing
                ? `/api/patients/${editing}`
                : "/api/patients",
            {
                method: editing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            }
        );

        const saved = await res.json().catch(() => null);

        if (!res.ok) {
            toast.error(saved?.error || "Failed to save patient.");
            return;
        }

        // updating a patient with no running agreement: open one with the charge typed
        if (editing && hasAgreement === false && Number(form.serviceCharge) > 0) {
            const r = await fetch(`/api/patients/${editing}/agreements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceChargeAmount: form.serviceCharge, agreementDetails: form.agreementDetails }),
            });
            if (!r.ok) {
                // patient details are saved; the popup stays open to fix the charge and Update again
                toast.error((await r.json().catch(() => null))?.error || "Patient updated, but the agreement could not be opened.");
                return;
            }
            toast.success("Patient updated, agreement opened");
        } else toast.success(editing ? "Patient updated" : "Patient registered");

        const after = editing && rxAfter ? editing : null;
        const followUpDate = form.followUpDate;
        closeModal();
        load();

        if (after) {
            if (can("CASE.C")) await openNewCaseRx(after, followUpDate);
            else router.push(`/cases/patient/${after}`);
        } else if (!editing && saved?.id) {
            if (!can("CASE.C")) {
                if (confirm("Patient added. Go to Bill Collection now?")) {
                    router.push(`/payments?patientId=${saved.id}`);
                }
                return;
            }
            // straight to the first visit: open Case-01 for today and write its prescription
            await openNewCaseRx(saved.id, followUpDate);
        }
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Patients
                    </h1>

                    <p className="text-sm text-slate-500">
                        Register new and manage existing patients.
                    </p>
                </div>

                {can("PATIENT.C") && (
                    <Button onClick={openNew}>
                        <Plus size={16} className="mr-1.5" />
                        New Patient
                    </Button>
                )}
            </div>

            {/* Patient List */}
            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-80">
                        <Label>Search</Label>

                        <Input
                            placeholder="Search name, phone or patient no..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && search()
                            }
                        />
                    </div>

                    <div className="sm:w-44">
                        <Label>Gender</Label>

                        <select
                            className="input"
                            value={genderFilter}
                            onChange={(e) => {
                                setGenderFilter(e.target.value);
                                search(e.target.value);
                            }}
                        >
                            <option value="">All Genders</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div className="sm:w-40">
                        <Label>Admission From</Label>

                        <DatePicker
                            selected={dateFrom ? new Date(dateFrom) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateFrom(v);
                                search(genderFilter, v, dateTo);
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>Admission To</Label>

                        <DatePicker
                            selected={dateTo ? new Date(dateTo) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateTo(v);
                                search(genderFilter, dateFrom, v);
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            minDate={dateFrom ? new Date(dateFrom) : undefined}
                            isClearable
                        />
                    </div>

                    <Button onClick={() => search()}>
                        <Search size={16} className="mr-1.5" />
                        Search
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">
                                    Patient No
                                </th>

                                <th className="p-3">
                                    Name
                                </th>

                                <th className="p-3">
                                    Phone
                                </th>

                                <th className="p-3">
                                    Gender
                                </th>

                                <th className="p-3">
                                    Blood Group
                                </th>

                                <th className="p-3">
                                    Age
                                </th>

                                <th className="p-3">
                                    Admission Date
                                </th>

                                <th className="p-3">
                                    Email
                                </th>

                                <th className="p-3">
                                    Address
                                </th>

                                <th className="p-3">
                                    Cases
                                </th>

                                <th className="p-3 text-right whitespace-nowrap">
                                    Total Agreement Charge
                                </th>

                                <th className="p-3"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b"
                                >
                                    <td className="p-3">
                                        {p.patientNo}
                                    </td>

                                    <td className="p-3 font-medium">
                                        {p.name}
                                    </td>

                                    <td className="p-3">
                                        {p.phone}
                                    </td>

                                    <td className="p-3">
                                        {p.gender
                                            ? p.gender.charAt(0) +
                                              p.gender
                                                  .slice(1)
                                                  .toLowerCase()
                                            : "-"}
                                    </td>

                                    <td className="p-3">
                                        {p.bloodGroup || "-"}
                                    </td>

                                    <td className="p-3">
                                        {p.age ?? "-"}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {fmtDate(p.admissionDate)}
                                    </td>

                                    <td className="p-3">
                                        {p.email || "-"}
                                    </td>

                                    <td className="p-3 max-w-[180px] truncate" title={p.address || ""}>
                                        {p.address || "-"}
                                    </td>

                                    <td className="p-3">
                                        {p._count.caseHistories}
                                    </td>

                                    <td className="p-3 text-right whitespace-nowrap">
                                        {p.agreement ? (
                                            <>
                                                <div className="font-semibold">{tk(p.agreement.serviceChargeAmount)}</div>
                                                <div className="text-xs text-slate-500">Dues {tk(p.agreement.dues)}</div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">No agreement</span>
                                        )}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        <button
                                            className="rounded-lg p-1.5 text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => router.push(collectionHistoryUrl(p.id))}
                                            title="Collection history"
                                            aria-label="Collection history"
                                        >
                                            <ReceiptText size={16} />
                                        </button>

                                        {p.agreement && can("PATIENT.E") && (
                                            <button
                                                className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50"
                                                onClick={async () => (await closeAgreement(p.agreement)) && load()}
                                                title="Close agreement"
                                                aria-label="Close agreement"
                                            >
                                                <Lock size={16} />
                                            </button>
                                        )}

                                        <button
                                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                                            onClick={() =>
                                                router.push(
                                                    `/cases/patient/${p.id}`
                                                )
                                            }
                                            title="View case history"
                                            aria-label="View case history"
                                        >
                                            <FolderOpen size={16} />
                                        </button>

                                        {can("PATIENT.E") && (
                                            <button
                                                className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                                onClick={() => openEdit(p)}
                                                title="Edit patient"
                                                aria-label="Edit patient"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {can("PATIENT.E") && (
                                            <button
                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                onClick={() => removePatient(p)}
                                                title="Delete patient"
                                                aria-label="Delete patient"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {loading && items.length === 0 && <TableLoader colSpan={12} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-slate-500">
                                        No patients found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>
                            Showing{" "}
                            {total === 0
                                ? 0
                                : (page - 1) * pageSize + 1}
                            –{Math.min(page * pageSize, total)} of{" "}
                            {total}
                        </span>

                        <select
                            className="input !w-auto py-1"
                            value={pageSize}
                            onChange={(e) =>
                                changePageSize(Number(e.target.value))
                            }
                        >
                            {[10, 25, 50].map((n) => (
                                <option key={n} value={n}>
                                    {n} / page
                                </option>
                            ))}
                        </select>
                    </div>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPage={goToPage}
                    />
                </div>
            </Card>

            {/* Patient Form Modal */}
            <Modal
                open={modalOpen}
                title={editing ? "Update Patient" : "New Patient"}
                onClose={closeModal}
            >
                <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rxAfter && (
                        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
                            No agreement yet. Enter the Total Agreement Charge; Update opens the agreement and a new case&apos;s prescription.
                        </div>
                    )}
                    {fields
                        .filter((f) => (agreementInForm || !NEW_ONLY.includes(f.key)) && (caseInForm || !CASE_ONLY.includes(f.key)))
                        .map((f) => (
                        <div
                            key={f.key}
                            className={
                                f.type === "textarea"
                                    ? "sm:col-span-2"
                                    : ""
                            }
                        >
                            <Label
                                required={
                                    f.key === "name" || f.key === "phone"
                                }
                            >
                                {f.label}
                            </Label>

                            {f.type === "photo" ? (
                                <PhotoUpload
                                    value={form[f.key]}
                                    onChange={(v) =>
                                        setForm({ ...form, [f.key]: v })
                                    }
                                    size={56}
                                />
                            ) : f.type === "textarea" ? (
                                <Textarea
                                    value={form[f.key]}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                />
                            ) : f.type === "radio" ? (
                                <div className="flex items-center gap-5 pt-2">
                                    {(selectOptions[f.key] || []).map(
                                        (o) => (
                                            <label
                                                key={o.value}
                                                className="flex cursor-pointer items-center gap-1.5 text-sm"
                                            >
                                                <input
                                                    type="radio"
                                                    name={f.key}
                                                    value={o.value}
                                                    checked={
                                                        form[f.key] === o.value
                                                    }
                                                    onChange={() =>
                                                        setForm({
                                                            ...form,
                                                            [f.key]: o.value,
                                                        })
                                                    }
                                                />
                                                {o.label}
                                            </label>
                                        )
                                    )}
                                </div>
                            ) : f.type === "select" ? (
                                <select
                                    className="input"
                                    value={form[f.key]}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            [f.key]: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Select</option>
                                    {(selectOptions[f.key] || []).map(
                                        (o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            ) : f.type === "date" ? (
                                <DatePicker
                                    selected={
                                        form[f.key]
                                            ? new Date(form[f.key])
                                            : null
                                    }
                                    onChange={(d: Date | null) => {
                                        const v = d ? toYMD(d) : "";
                                        setForm({
                                            ...form,
                                            [f.key]: v,
                                            ...(f.key === "dateOfBirth"
                                                ? { age: v ? ageFromDob(v) : form.age }
                                                : {}),
                                        });
                                    }}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="dd/mm/yyyy"
                                    className="input"
                                    wrapperClassName="w-full"
                                    minDate={f.key === "followUpDate" ? new Date() : undefined}
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                    isClearable
                                />
                            ) : (
                                <Input
                                    type={f.type === "number" ? "number" : f.type}
                                    step={f.type === "number" ? "0.01" : undefined}
                                    min={f.type === "number" ? "0" : undefined}
                                    value={form[f.key]}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setForm({
                                            ...form,
                                            [f.key]: v,
                                            ...(f.key === "age"
                                                ? { dateOfBirth: dobFromAge(v) || form.dateOfBirth }
                                                : {}),
                                        });
                                    }}
                                    required={
                                        f.key === "name" ||
                                        f.key === "phone"
                                    }
                                />
                            )}
                        </div>
                    ))}

                    {editing && (
                        <div className="sm:col-span-2">
                            <AgreementPanel patientId={editing} canEdit={can("PATIENT.E")} hideOpen={agreementInForm} />
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 sm:col-span-2">
                        <div>
                            {editing && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        closeModal();
                                        router.push(
                                            `/cases/patient/${editing}`
                                        );
                                    }}
                                >
                                    <FolderOpen size={16} className="mr-1.5" />
                                    Case History
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeModal}
                        >
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>

                        <Button type="submit" disabled={saving}>
                            {editing ? (
                                <Save size={16} className="mr-1.5" />
                            ) : (
                                <UserPlus size={16} className="mr-1.5" />
                            )}
                            {editing ? "Update" : "Register Patient"}
                        </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
