"use client";
import { useEffect, useState } from "react";
import { BlockLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Textarea } from "@/components/ui";
import { Send, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCan } from "@/components/permissions-context";
import PatientPicker, { type PickedPatient } from "@/components/patient-picker";
import ConfirmDialog from "@/components/confirm-dialog";
import SmsBalance from "@/components/sms-balance";
import { smsInfo } from "@/lib/sms-text";

const TABS = ["Send Greeting", "Template Management"] as const;

// /greetings/org/{organization object_id}: send a template to many patients, and manage the templates
export default function Greetings() {
    const [loading, setLoading] = useState(true);
    const can = useCan();
    const [tab, setTab] = useState<(typeof TABS)[number]>("Send Greeting");
    const [templates, setTemplates] = useState<any[]>([]);
    const [f, setF] = useState<any>({
        name: "",
        subject: "",
        body: "",
        channel: "EMAIL",
    });
    const [templateId, setTemplateId] = useState("");
    const [picked, setPicked] = useState<PickedPatient[]>([]);
    const [confirmSend, setConfirmSend] = useState(false);
    const [sending, setSending] = useState(false);
    const [balanceKey, setBalanceKey] = useState(0);

    const load = () => {
        setLoading(true);
        return fetch("/api/greetings/templates")
            .then((r) => r.json())
            .then(setTemplates)
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, []);

    const template = templates.find((t) => String(t.id) === templateId);

    const save = async (e: any) => {
        e.preventDefault();

        const res = await fetch("/api/greetings/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
        });

        if (!res.ok) {
            const d = await res.json().catch(() => null);
            toast.error(d?.error || "Failed to save template.");
            return;
        }

        toast.success("Template saved");
        setF({ name: "", subject: "", body: "", channel: "EMAIL" });
        load();
    };

    const askSend = () => {
        if (!template) return toast.error("Select a template first.");
        if (!picked.length) return toast.error("Select at least one patient.");
        setConfirmSend(true);
    };

    const doSend = async () => {
        setSending(true);
        const r = await fetch("/api/greetings/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId: Number(templateId), patientIds: picked.map((p) => p.id) }),
        });
        const d = await r.json().catch(() => null);
        setSending(false);
        setConfirmSend(false);
        setBalanceKey((k) => k + 1);
        if (!r.ok) return toast.error(d?.error || "Sending failed.", { duration: 7000 });

        const skipped = d.skipped ? ` Skipped ${d.skipped} without ${template?.channel === "EMAIL" ? "an email" : "a mobile number"}.` : "";
        if (d.failed) toast.error(`Sent ${d.sent}, failed ${d.failed}: ${(d.errors || []).join("; ")}.${skipped}`, { duration: 9000 });
        else toast.success(`Sent to ${d.sent} patient${d.sent === 1 ? "" : "s"}.${skipped}`, { duration: skipped ? 7000 : 4000 });
    };

    const smsParts = template?.channel === "SMS" ? smsInfo(template.body || "").parts : 0;

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">Greetings</h1>

                    <p className="text-sm text-slate-500">
                        Send greetings and manage message templates.
                    </p>
                </div>
                <SmsBalance refreshKey={balanceKey} />
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-1 border-b">
                {TABS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-colors ${
                            tab === t
                                ? "border-teal-600 bg-teal-50/50 font-semibold text-teal-700"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Send Greeting tab */}
            {tab === "Send Greeting" && (
                <div className="space-y-3">
                    <Card className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="sm:flex-1">
                                <Label required>Template</Label>

                                <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                                    <option value="">Select</option>

                                    {templates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.channel})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {can("GREETING.C") && (
                                <Button onClick={askSend} disabled={sending}>
                                    {sending ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Send size={16} className="mr-1.5" />}
                                    Send Message{picked.length ? ` (${picked.length})` : ""}
                                </Button>
                            )}
                        </div>
                        {template && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-500" title={template.body}>
                                {template.body}
                            </p>
                        )}
                    </Card>

                    <PatientPicker selected={picked} onChange={setPicked} />
                </div>
            )}

            <ConfirmDialog
                open={confirmSend}
                busy={sending}
                title={`Send "${template?.name || ""}"?`}
                message={
                    <>
                        It goes by <b>{template?.channel}</b> to <b>{picked.length}</b> selected patient{picked.length === 1 ? "" : "s"}.
                        {template?.channel === "SMS" && (
                            <p className="mt-2">
                                About {(smsParts * picked.length).toLocaleString("en-US")} SMS ({smsParts} per patient) come off the SMS
                                balance; patients without a mobile number are skipped.
                            </p>
                        )}
                    </>
                }
                confirmLabel="Send"
                onConfirm={doSend}
                onCancel={() => setConfirmSend(false)}
            />

            {/* Template Management tab */}
            {tab === "Template Management" && (
                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">
                            New Template
                        </h2>

                        <form onSubmit={save} className="space-y-3">
                            <div>
                                <Label required>Name</Label>

                                <Input
                                    value={f.name}
                                    onChange={(e) =>
                                        setF({ ...f, name: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <Label>Subject</Label>

                                <Input
                                    value={f.subject}
                                    onChange={(e) =>
                                        setF({
                                            ...f,
                                            subject: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Channel</Label>

                                <select
                                    className="input"
                                    value={f.channel}
                                    onChange={(e) =>
                                        setF({
                                            ...f,
                                            channel: e.target.value,
                                        })
                                    }
                                >
                                    <option>EMAIL</option>
                                    <option>SMS</option>
                                    <option>WHATSAPP</option>
                                </select>
                            </div>

                            <div>
                                <Label>Body</Label>

                                <Textarea
                                    className="input min-h-32"
                                    value={f.body}
                                    onChange={(e) =>
                                        setF({ ...f, body: e.target.value })
                                    }
                                    placeholder="Use {{patientName}}, {{phone}}, {{patientNo}}"
                                />
                            </div>

                            <Button>
                                <Save size={16} className="mr-1.5" />
                                Save Template
                            </Button>
                        </form>
                    </Card>

                    <Card className="p-5">
                        <h2 className="mb-4 font-semibold">
                            Existing Templates
                        </h2>

                        <div className="space-y-2">
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="rounded-xl border p-3"
                                >
                                    <div className="font-medium">
                                        {t.name}
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        {t.channel}
                                    </div>
                                </div>
                            ))}

                            {loading && templates.length === 0 && <BlockLoader />}

                            {!loading && templates.length === 0 && (
                                <div className="py-6 text-center text-slate-500">
                                    No templates yet
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
