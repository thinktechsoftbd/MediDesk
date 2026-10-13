"use client";

import { useEffect, useState } from "react";
import { Card, Label, Button, Textarea, Input, SearchSelect } from "@/components/ui";
import { Send, Loader2, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import SmsBalance from "@/components/sms-balance";
import { smsInfo } from "@/lib/sms-text";
import { useCan } from "@/components/permissions-context";

type Source = "all" | "patients" | "numbers";

export default function BulkSms() {
    const can = useCan();
    const [patients, setPatients] = useState<any[]>([]);
    const [source, setSource] = useState<Source>("patients");
    const [picked, setPicked] = useState<any[]>([]);
    const [numbers, setNumbers] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [promotional, setPromotional] = useState(false);
    const [sending, setSending] = useState(false);
    const [balanceKey, setBalanceKey] = useState(0);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/patients")
            .then((r) => r.json())
            .then((d) => setPatients(Array.isArray(d) ? d : []));
    }, []);

    const info = smsInfo(message);
    const withPhone = patients.filter((p) => p.phone);
    const numberList = numbers.split(/[\s,;]+/).filter(Boolean);
    const count = source === "all" ? withPhone.length : source === "patients" ? picked.length : numberList.length;

    const addPatient = (id: string) => {
        const p = patients.find((x) => String(x.id) === id);
        if (p && !picked.some((x) => x.id === p.id)) setPicked([...picked, p]);
    };

    const send = async () => {
        if (!message.trim()) return toast.error("Write the SMS message first.");
        if (info.over) return toast.error(`Message is too long (max ${info.max} characters).`);
        if (!count) return toast.error("Add at least one recipient.");
        if (!confirm(`Send this SMS to ${count} recipient${count === 1 ? "" : "s"}?`)) return;

        setSending(true);
        const r = await fetch("/api/sms/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source,
                patientIds: picked.map((p) => p.id),
                numbers,
                message,
                title,
                promotional,
            }),
        });
        const d = await r.json().catch(() => null);
        setSending(false);
        setBalanceKey((k) => k + 1);

        if (!r.ok) return toast.error(d?.error || "SMS sending failed.", { duration: 7000 });

        if (d.failed) {
            toast.error(
                `Sent ${d.sent}, failed ${d.failed}.${d.invalid?.length ? " Rejected: " + d.invalid.join(", ") : ""}${
                    d.skipped?.length ? " No valid number: " + d.skipped.join(", ") : ""
                }`,
                { duration: 8000 }
            );
        } else {
            toast.success(`SMS sent to ${d.sent} recipient${d.sent === 1 ? "" : "s"}`);
        }
        setHistory((h) => [
            ...d.campaigns.map((uid: string) => ({ uid, title: title || "Bulk SMS", at: new Date(), sent: d.sent, status: null })),
            ...h,
        ]);
    };

    const checkStatus = async (uid: string) => {
        const r = await fetch(`/api/sms/campaign-status?uid=${encodeURIComponent(uid)}`);
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Status check failed.");
        setHistory((h) => h.map((x) => (x.uid === uid ? { ...x, status: d.summary } : x)));
    };

    return (
        <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bulk SMS</h1>
                    <p className="text-sm text-slate-500">Send one message to many patients or numbers through ADN SMS.</p>
                </div>
                <SmsBalance refreshKey={balanceKey} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                <Card className="p-5">
                    <h2 className="mb-3 font-semibold">Recipients</h2>

                    <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                        {([
                            ["patients", "Selected patients"],
                            ["all", `All patients (${withPhone.length})`],
                            ["numbers", "Custom numbers"],
                        ] as [Source, string][]).map(([v, l]) => (
                            <label key={v} className="flex cursor-pointer items-center gap-1.5">
                                <input type="radio" name="source" checked={source === v} onChange={() => setSource(v)} />
                                {l}
                            </label>
                        ))}
                    </div>

                    {source === "patients" && (
                        <div>
                            <Label>Add Patient</Label>
                            <SearchSelect
                                options={patients.map((p) => ({ value: String(p.id), label: `${p.name} (${p.patientNo}) ${p.phone || ""}` }))}
                                value=""
                                onChange={addPatient}
                                placeholder="Search patient..."
                            />
                            <div className="mt-3 flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                                {picked.map((p) => (
                                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800">
                                        {p.name} · {p.phone || "no phone"}
                                        <button type="button" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} aria-label="Remove">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {picked.length === 0 && <span className="text-sm text-slate-500">No patients added yet.</span>}
                            </div>
                            {picked.length > 0 && (
                                <button type="button" className="mt-2 text-xs text-red-600 hover:underline" onClick={() => setPicked([])}>
                                    Clear all
                                </button>
                            )}
                        </div>
                    )}

                    {source === "all" && (
                        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                            Every patient with a phone number ({withPhone.length}) will get this SMS. Duplicate and invalid numbers are skipped.
                        </p>
                    )}

                    {source === "numbers" && (
                        <div>
                            <Label>Mobile Numbers</Label>
                            <Textarea
                                className="input min-h-[160px] resize-y font-mono text-sm"
                                placeholder={"01712345678, 01812345678\nOne per line or comma separated"}
                                value={numbers}
                                onChange={(e) => setNumbers(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-slate-500">{numberList.length} number{numberList.length === 1 ? "" : "s"}</p>
                        </div>
                    )}
                </Card>

                <Card className="p-5">
                    <h2 className="mb-3 font-semibold">Message</h2>

                    <div className="grid gap-3">
                        <div>
                            <Label>Campaign Title</Label>
                            <Input value={title} placeholder="e.g. Eid greetings" onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div>
                            <Label required>Message</Label>
                            <Textarea className="input min-h-[140px] resize-y" value={message} onChange={(e) => setMessage(e.target.value)} />
                            <p className={`mt-1 text-xs ${info.over ? "text-red-600" : "text-slate-500"}`}>
                                {info.len}/{info.max} characters
                                {info.len > 0 && ` · ${info.parts} SMS each`}
                                {info.unicode && " · Bangla (Unicode)"}
                                {source !== "numbers" && <> · Placeholders: {"{{patientName}}"}, {"{{patientNo}}"}, {"{{clinic}}"}</>}
                            </p>
                        </div>

                        {!info.unicode && (
                            <label className="flex items-center gap-1.5 text-sm">
                                <input type="checkbox" checked={promotional} onChange={(e) => setPromotional(e.target.checked)} />
                                Promotional message (offers, greetings)
                            </label>
                        )}

                        {can("GREETING.C") && (
                            <div>
                                <Button onClick={send} disabled={sending || !count || !message.trim()}>
                                    {sending ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Send size={16} className="mr-1.5" />}
                                    {sending ? "Sending..." : `Send SMS (${count})`}
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {history.length > 0 && (
                <Card className="mt-4 p-5">
                    <h2 className="mb-3 font-semibold">Sent This Session</h2>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="p-2">Campaign</th>
                                <th className="p-2">Title</th>
                                <th className="p-2">Time</th>
                                <th className="p-2">Delivery</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h) => (
                                <tr key={h.uid} className="border-b last:border-0">
                                    <td className="p-2 font-mono text-xs">{h.uid}</td>
                                    <td className="p-2">{h.title}</td>
                                    <td className="p-2">{h.at.toLocaleTimeString()}</td>
                                    <td className="p-2">
                                        {h.status
                                            ? `Success ${h.status.success} · Pending ${h.status.pending} · Failed ${h.status.failed}`
                                            : "-"}
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
                                            onClick={() => checkStatus(h.uid)}
                                        >
                                            <RefreshCw size={13} /> Check status
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
