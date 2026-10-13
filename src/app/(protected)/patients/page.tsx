
"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Textarea, Modal, Pagination } from "@/components/ui";
import { Plus, Search, X, UserPlus, Save, Pencil, ChevronLeft, ChevronRight, FolderOpen, Trash2, ReceiptText, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
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
    bloodGroup: "",
    serviceCharge: "",
    agreementDetails: "",
    photoUrl: "",
    dateOfBirth: "",
    admissionDate: "",
    notes: "",
};

const fields: { key: string; label: string; type: string }[] = [
    { key: "name", label: "Full Name", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "age", label: "Age", type: "text" },
    { key: "dateOfBirth", label: "Date Of Birth", type: "date" },
    { key: "gender", label: "Gender", type: "radio" },
    { key: "bloodGroup", label: "Blood Group", type: "select" },
    { key: "admissionDate", label: "Admission Date", type: "date" },
    { key: "serviceCharge", label: "Total Service Charge", type: "number" },
    { key: "photoUrl", label: "Patient Photo", type: "photo" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "agreementDetails", label: "Agreement Details", type: "textarea" },
    { key: "notes", label: "Remarks", type: "textarea" },
];

// agreement fields are only typed for a new patient; editing uses the agreement panel
const NEW_ONLY = ["serviceCharge", "agreementDetails"];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const selectOptions: Record<string, { value: string; label: string }[]> = {
    gender: [
        { value: "MALE", label: "Male" },
        { value: "FEMALE", label: "Female" },
        { value: "OTHER", label: "Other" },
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

        // arriving from patient search: ?new=1&name=...
        const sp = new URLSearchParams(window.location.search);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const openNew = () => {
        setEditing(null);
        setForm({
            ...empty,
            admissionDate: new Date().toISOString().slice(0, 10),
        });
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p.id);
        setForm({
            ...p,
            age: p.age || "",
            bloodGroup: p.bloodGroup || "",
            photoUrl: p.photoUrl || "",
            dateOfBirth: p.dateOfBirth?.slice(0, 10) || "",
            admissionDate: p.admissionDate?.slice(0, 10) || "",
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setForm(empty);
    };

    const save = async (e: any) => {
        e.preventDefault();

        if (!editing && !Number(form.serviceCharge)) {
            if (!confirm("Total Service Charge is empty, so no agreement will be opened. Continue?"))
                return;
        }

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

        toast.success(editing ? "Patient updated" : "Patient registered");
        closeModal();
        load();

        if (!editing && saved?.id) {
            if (confirm("Patient added. Go to case history now?")) {
                router.push(`/cases/patient/${saved.id}`);
            }
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
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
                                    Total Service Charge
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
                    {fields.filter((f) => !(editing && NEW_ONLY.includes(f.key))).map((f) => (
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
                            <AgreementPanel patientId={editing} canEdit={can("PATIENT.E")} />
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

                        <Button type="submit">
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
