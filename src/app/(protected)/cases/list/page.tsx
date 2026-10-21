"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Input, Label, Button, SearchSelect, Pagination, Modal } from "@/components/ui";
import { Plus, Search, RotateCw, Trash2, FolderOpen, Printer, Pill, X, UserPlus } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { medicineLabel } from "@/lib/medicine-label";
import { useCan } from "@/components/permissions-context";

const toYMD = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};

const statusColors: Record<string, string> = {
    OPEN: "bg-amber-50 text-amber-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-teal-50 text-teal-700",
    CLOSED: "bg-slate-100 text-slate-600",
};

export default function CaseHistoryList() {
    const [loading, setLoading] = useState(true);
    const can = useCan();
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [q, setQ] = useState("");
    const [patientId, setPatientId] = useState("");
    // New Case: pick the patient, then the case is written on the prescription page
    const [newOpen, setNewOpen] = useState(false);
    const [newPatientId, setNewPatientId] = useState("");
    const [newDate, setNewDate] = useState("");
    const [creating, setCreating] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const load = (
        pid = patientId,
        query = q,
        from = dateFrom,
        to = dateTo,
        pg = page,
        ps = pageSize
    ) => {
        const params = new URLSearchParams({
            page: String(pg),
            pageSize: String(ps),
        });
        if (query.trim()) params.set("q", query.trim());
        if (pid) params.set("patientId", pid);
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);
        setLoading(true);
        fetch("/api/cases?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                if (d?.error) toast.error(d.error, { duration: 8000 });
                setItems(d.items || []);
                setTotal(d.total || 0);
            })
            .finally(() => setLoading(false));
    };

    const search = (
        pid = patientId,
        query = q,
        from = dateFrom,
        to = dateTo
    ) => {
        setPage(1);
        load(pid, query, from, to, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load(patientId, q, dateFrom, dateTo, pg);
    };

    const changePageSize = (ps: number) => {
        setPageSize(ps);
        setPage(1);
        load(patientId, q, dateFrom, dateTo, 1, ps);
    };

    useEffect(() => {
        fetch("/api/patients")
            .then((r) => r.json())
            .then(setPatients);
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refresh = () => {
        setQ("");
        setPatientId("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
        load("", "", "", "", 1);
    };

    const openNew = () => {
        setNewPatientId(patientId);
        setNewDate(toYMD(new Date()));
        setNewOpen(true);
    };

    const createCase = async () => {
        if (!newPatientId) return toast.error("Select a patient.");
        if (creating) return;
        setCreating(true);
        const r = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId: Number(newPatientId), caseDate: newDate || toYMD(new Date()), status: "IN_PROGRESS" }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.id) {
            setCreating(false);
            return toast.error(d?.error || "Could not create the case.");
        }
        toast.success(`Case-${String(d.caseNo).padStart(2, "0")} created`);
        router.push(`/cases/${d.id}/prescription`);
    };

    const remove = async (c: any) => {
        if (!confirm(`Delete Case-${String(c.caseNo).padStart(2, "0")} of ${c.patient.name}?`)) return;
        const r = await fetch(`/api/cases/${c.id}`, { method: "DELETE" });
        if (r.ok) toast.success("Case deleted");
        else toast.error((await r.json().catch(() => null))?.error || "Failed to delete case.");
        load();
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Case History
                    </h1>

                    <p className="text-sm text-slate-500">
                        All recorded cases in tabular form.
                    </p>
                </div>

                {can("CASE.C") && (
                    <Button onClick={openNew}>
                        <Plus size={16} className="mr-1.5" />
                        New Case
                    </Button>
                )}
            </div>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="sm:w-64">
                        <Label>Patient</Label>

                        <SearchSelect
                            options={[
                                { value: "", label: "All Patients" },
                                ...patients.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} — ${p.phone}`,
                                })),
                            ]}
                            value={patientId}
                            onChange={(v) => {
                                setPatientId(v);
                                search(v);
                            }}
                            placeholder="All Patients"
                        />
                    </div>

                    <div className="sm:w-64">
                        <Label>Search</Label>

                        <Input
                            placeholder="Problem, treatment, tooth..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && search()
                            }
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>Case From</Label>

                        <DatePicker
                            selected={dateFrom ? new Date(dateFrom) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateFrom(v);
                                search(patientId, q, v, dateTo);
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>Case To</Label>

                        <DatePicker
                            selected={dateTo ? new Date(dateTo) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateTo(v);
                                search(patientId, q, dateFrom, v);
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

                    <Button
                        variant="secondary"
                        onClick={refresh}
                        title="Reset filters and reload"
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">Patient</th>
                                <th className="p-3">Case</th>
                                <th className="p-3">Tooth</th>
                                <th className="p-3">Problem</th>
                                <th className="p-3">Treatment</th>
                                <th className="p-3">Medicines</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Case Date</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((c) => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-3 font-medium">
                                        {c.patient.name}
                                    </td>

                                    <td className="p-3">
                                        Case-
                                        {String(c.caseNo).padStart(2, "0")}
                                    </td>

                                    <td className="p-3">
                                        {c.toothNumber || "-"}
                                    </td>

                                    <td className="p-3 max-w-[200px] truncate" title={c.problem || ""}>
                                        {c.problem || "-"}
                                    </td>

                                    <td className="p-3 max-w-[200px] truncate" title={c.treatment || ""}>
                                        {c.treatment || "-"}
                                    </td>

                                    <td className="p-3 min-w-[180px]">
                                        {(() => {
                                            const meds = (c.prescriptions || []).flatMap((pr: any) => pr.items || []);
                                            if (!meds.length) return <span className="text-slate-400">-</span>;
                                            return (
                                                <ul className="space-y-0.5 text-xs">
                                                    {meds.map((m: any) => (
                                                        <li key={m.id}>
                                                            <span className="font-medium text-slate-700">{medicineLabel(m.medicine)}</span>
                                                            {m.dosage && m.dosage !== "-" && <span className="text-slate-500"> · {m.dosage}</span>}
                                                            {m.duration && m.duration !== "-" && <span className="text-slate-500"> · {m.duration}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        })()}
                                    </td>

                                    <td className="p-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                statusColors[c.status] ||
                                                "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {c.status}
                                        </span>
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {fmtDate(c.caseDate)}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        <button
                                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                                            onClick={() =>
                                                router.push(
                                                    `/cases/patient/${c.patientId}`
                                                )
                                            }
                                            title="View patient case history"
                                        >
                                            <FolderOpen size={16} />
                                        </button>

                                        <button
                                            className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => router.push(`/cases/${c.id}/prescription`)}
                                            title="Write prescription (Rx)"
                                        >
                                            <Pill size={16} />
                                        </button>

                                        <a
                                            className="inline-block rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                                            href={`/print/prescription/${c.id}?print=1`}
                                            target="_blank"
                                            title="Print prescription on pad"
                                        >
                                            <Printer size={16} />
                                        </a>

                                        {can("CASE.E") && (
                                            <button
                                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                                onClick={() => remove(c)}
                                                title="Delete case"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {loading && items.length === 0 && <TableLoader colSpan={9} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-8 text-center text-slate-500"
                                    >
                                        No cases found
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
                            {total === 0 ? 0 : (page - 1) * pageSize + 1}
                            –{Math.min(page * pageSize, total)} of {total}
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

            <Modal open={newOpen} title="New Case" onClose={() => setNewOpen(false)}>
                <div className="grid gap-3">
                    <div>
                        <Label required>Patient</Label>
                        <SearchSelect
                            options={patients.map((p) => ({
                                value: String(p.id),
                                label: `${p.name} — ${p.phone}`,
                            }))}
                            value={newPatientId}
                            onChange={setNewPatientId}
                            placeholder="Select patient"
                        />
                        {can("PATIENT.C") && (
                            <Link href="/patients?new=1" className="mt-1.5 inline-flex items-center text-sm font-medium text-teal-700 hover:underline">
                                <UserPlus size={14} className="mr-1" />
                                New patient? Register first
                            </Link>
                        )}
                    </div>
                    <div className="sm:w-48">
                        <Label>Case Date</Label>
                        <DatePicker
                            selected={newDate ? new Date(newDate) : null}
                            onChange={(d: Date | null) => setNewDate(d ? toYMD(d) : "")}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Complaints, O/E, advice, medicines and follow-up are written on the prescription page.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setNewOpen(false)}>
                            <X size={16} className="mr-1.5" />
                            Cancel
                        </Button>
                        <Button type="button" disabled={creating || !newPatientId} onClick={createCase}>
                            <Pill size={16} className="mr-1.5" />
                            Write Prescription
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
