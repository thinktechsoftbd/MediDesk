"use client";
import { useEffect, useState } from "react";
import { TableLoader } from "@/components/loaders";
import { useRouter } from "next/navigation";
import { Card, Label, Button, SearchSelect, Pagination, Textarea } from "@/components/ui";
import { Search, RotateCw, FolderOpen, Pencil, Send, Loader2 } from "lucide-react";
import CaseFormModal from "@/components/case-form-modal";
import toast from "react-hot-toast";
import SmsBalance from "@/components/sms-balance";
import { smsInfo } from "@/lib/sms-text";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const PAGE_SIZE = 200;

const DEFAULT_MESSAGE =
    "Dear {{patientName}}, your next dental follow-up at {{clinic}} is on {{date}}. Please visit on time. Thank you.";

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

export default function FollowUps() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [patients, setPatients] = useState<any[]>([]);

    // filters
    const [patientId, setPatientId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [includePast, setIncludePast] = useState(false);
    const [smsStatus, setSmsStatus] = useState("");

    // sms
    const [mode, setMode] = useState<"all" | "selected">("selected");
    const [checked, setChecked] = useState<number[]>([]);
    const [message, setMessage] = useState(DEFAULT_MESSAGE);
    const [sending, setSending] = useState(false);

    const [editingCase, setEditingCase] = useState<any | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const filters = (o: any = {}) => ({
        patientId: o.patientId ?? patientId,
        dateFrom: o.dateFrom ?? dateFrom,
        dateTo: o.dateTo ?? dateTo,
        includePast: o.includePast ?? includePast,
        smsStatus: o.smsStatus ?? smsStatus,
    });

    const load = (o: any = {}, pg = page) => {
        const f = filters(o);
        const params = new URLSearchParams({
            page: String(pg),
            pageSize: String(PAGE_SIZE),
        });
        if (f.patientId) params.set("patientId", f.patientId);
        if (f.dateFrom) params.set("dateFrom", f.dateFrom);
        if (f.dateTo) params.set("dateTo", f.dateTo);
        if (f.includePast) params.set("includePast", "1");
        if (f.smsStatus) params.set("smsStatus", f.smsStatus);
        setLoading(true);
        fetch("/api/follow-ups?" + params.toString())
            .then((r) => r.json())
            .then((d) => {
                if (d?.error) toast.error(d.error, { duration: 8000 });
                setItems(d.items || []);
                setTotal(d.total || 0);
            })
            .finally(() => setLoading(false));
    };

    // any filter change: back to page 1, clear the selection
    const search = (o: any = {}) => {
        setPage(1);
        setChecked([]);
        load(o, 1);
    };

    const goToPage = (pg: number) => {
        setPage(pg);
        load({}, pg);
    };

    useEffect(() => {
        fetch("/api/patients")
            .then((r) => r.json())
            .then((d) => setPatients(Array.isArray(d) ? d : []));
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = (id: number) =>
        setChecked((c) =>
            c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
        );

    const pageIds = items.map((c) => c.id);
    const allOnPage =
        pageIds.length > 0 && pageIds.every((id) => checked.includes(id));

    const toggleAllOnPage = () =>
        setChecked((c) =>
            allOnPage
                ? c.filter((id) => !pageIds.includes(id))
                : Array.from(new Set([...c, ...pageIds]))
        );

    const sendCount = mode === "all" ? total : checked.length;
    const info = smsInfo(message);
    const [balanceKey, setBalanceKey] = useState(0);

    const sendSms = async () => {
        if (!message.trim()) {
            toast.error("Write the SMS message first.");
            return;
        }
        if (info.over) {
            toast.error(`Message is too long (max ${info.max} characters).`);
            return;
        }
        if (!sendCount) {
            toast.error(
                mode === "all"
                    ? "No patients match the current filters."
                    : "Tick at least one patient."
            );
            return;
        }
        if (
            !confirm(
                `Send follow-up SMS to ${sendCount} patient${sendCount === 1 ? "" : "s"}? Patients already sent will be skipped.`
            )
        )
            return;

        setSending(true);
        const r = await fetch("/api/follow-ups/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode,
                ids: checked,
                filters: filters(),
                message,
            }),
        });
        const d = await r.json().catch(() => null);
        setSending(false);

        if (!r.ok) {
            toast.error(d?.error || "SMS sending failed.");
            return;
        }

        if (d.failed) {
            toast.error(
                `Sent ${d.sent}, failed ${d.failed}.${d.errors?.length ? " " + d.errors[0] : ""}`,
                { duration: 7000 }
            );
        } else {
            toast.success(
                `SMS sent to ${d.sent} patient${d.sent === 1 ? "" : "s"}${d.campaign ? ` · Campaign ${d.campaign}` : ""}`,
                { duration: 6000 }
            );
        }
        setBalanceKey((k) => k + 1);
        setChecked([]);
        load();
    };

    const todayYMD = toYMD(new Date());
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Next Follow-up</h1>

                <p className="text-sm text-slate-500">
                    Patients due for their next visit, with SMS reminders.
                </p>
            </div>

            <div className="-mt-2 mb-3 flex justify-end">
                <SmsBalance refreshKey={balanceKey} />
            </div>

            {/* SMS panel */}
            <Card className="mb-4 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="lg:w-72">
                        <Label>Send To</Label>

                        <div className="space-y-2 pt-1">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="smsMode"
                                    checked={mode === "all"}
                                    onChange={() => setMode("all")}
                                />
                                All patients in filtered list
                                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                                    {total}
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="smsMode"
                                    checked={mode === "selected"}
                                    onChange={() => setMode("selected")}
                                />
                                Selective (ticked)
                                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                                    {checked.length}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex-1">
                        <Label required>Message</Label>

                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />

                        <p className={`mt-1 text-xs ${info.over ? "text-red-600" : "text-slate-500"}`}>
                            Placeholders: {"{{patientName}}"}, {"{{date}}"},{" "}
                            {"{{clinic}}"}, {"{{patientNo}}"} · {info.len}/{info.max} characters
                            {info.len > 0 && ` · ${info.parts} SMS each`}
                            {info.unicode && " · Bangla (Unicode)"}
                        </p>
                    </div>

                    <div className="lg:pt-6">
                        <Button
                            onClick={sendSms}
                            disabled={sending || !sendCount}
                            className="w-full lg:w-auto"
                        >
                            {sending ? (
                                <Loader2 size={16} className="mr-1.5 animate-spin" />
                            ) : (
                                <Send size={16} className="mr-1.5" />
                            )}
                            {sending
                                ? "Sending..."
                                : `Send SMS (${sendCount})`}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
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
                                search({ patientId: v });
                            }}
                            placeholder="All Patients"
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>From</Label>

                        <DatePicker
                            selected={dateFrom ? new Date(dateFrom) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateFrom(v);
                                search({ dateFrom: v });
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            isClearable
                        />
                    </div>

                    <div className="sm:w-40">
                        <Label>To</Label>

                        <DatePicker
                            selected={dateTo ? new Date(dateTo) : null}
                            onChange={(d: Date | null) => {
                                const v = d ? toYMD(d) : "";
                                setDateTo(v);
                                search({ dateTo: v });
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="dd/mm/yyyy"
                            className="input"
                            wrapperClassName="w-full"
                            minDate={dateFrom ? new Date(dateFrom) : undefined}
                            isClearable
                        />
                    </div>

                    <div className="sm:w-36">
                        <Label>SMS Status</Label>

                        <select
                            className="input"
                            value={smsStatus}
                            onChange={(e) => {
                                setSmsStatus(e.target.value);
                                search({ smsStatus: e.target.value });
                            }}
                        >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="sent">Sent</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-1.5 pb-2 text-sm">
                        <input
                            type="checkbox"
                            checked={includePast}
                            onChange={(e) => {
                                setIncludePast(e.target.checked);
                                search({ includePast: e.target.checked });
                            }}
                        />
                        Include past
                    </label>

                    <Button onClick={() => search()}>
                        <Search size={16} className="mr-1.5" />
                        Search
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => {
                            setPatientId("");
                            setDateFrom("");
                            setDateTo("");
                            setIncludePast(false);
                            setSmsStatus("");
                            search({
                                patientId: "",
                                dateFrom: "",
                                dateTo: "",
                                includePast: false,
                                smsStatus: "",
                            });
                        }}
                    >
                        <RotateCw size={16} className="mr-1.5" />
                        Refresh
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-3">
                                    <input
                                        type="checkbox"
                                        checked={allOnPage}
                                        onChange={toggleAllOnPage}
                                        disabled={mode === "all"}
                                        title="Select all on this page"
                                    />
                                </th>
                                <th className="p-3">Follow-up Date</th>
                                <th className="p-3">Patient</th>
                                <th className="p-3">Phone</th>
                                <th className="p-3">Case</th>
                                <th className="p-3">Problem</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">SMS</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((c) => {
                                const due = c.followUpDate?.slice(0, 10);
                                const isToday = due === todayYMD;
                                const isPast = due < todayYMD;

                                return (
                                    <tr key={c.id} className="border-b">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    mode === "all" ||
                                                    checked.includes(c.id)
                                                }
                                                disabled={mode === "all"}
                                                onChange={() => toggle(c.id)}
                                            />
                                        </td>

                                        <td className="p-3 whitespace-nowrap font-medium">
                                            {fmtDate(c.followUpDate)}
                                            {isToday && (
                                                <span className="ml-1.5 rounded-full bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">
                                                    Today
                                                </span>
                                            )}
                                            {isPast && (
                                                <span className="ml-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                                    Overdue
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-3 font-medium">
                                            {c.patient.name}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            {c.patient.phone}
                                        </td>

                                        <td className="p-3 whitespace-nowrap">
                                            Case-
                                            {String(c.caseNo).padStart(2, "0")}
                                        </td>

                                        <td className="p-3 max-w-[200px] truncate" title={c.problem || ""}>
                                            {c.problem || "-"}
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
                                            {c.followUpSmsSentAt ? (
                                                <span
                                                    className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
                                                    title={`Sent on ${fmtDate(c.followUpSmsSentAt)}`}
                                                >
                                                    Sent · {fmtDate(c.followUpSmsSentAt)}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                    Pending
                                                </span>
                                            )}
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
                                                className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                                                onClick={() => {
                                                    setEditingCase(c);
                                                    setModalOpen(true);
                                                }}
                                                title="Edit case / reschedule follow-up"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {loading && items.length === 0 && <TableLoader colSpan={9} />}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500">
                                        No follow-ups scheduled
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <span className="text-sm text-slate-500">
                        Showing{" "}
                        {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, total)} of {total}
                    </span>

                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPage={goToPage}
                    />
                </div>
            </Card>

            <CaseFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={() => load()}
                caseData={editingCase}
            />
        </div>
    );
}
