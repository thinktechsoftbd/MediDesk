"use client";
import { useEffect, useState } from "react";
import { BlockLoader } from "@/components/loaders";
import { Card, Input, Label, Button, Textarea, SearchSelect } from "@/components/ui";
import { Send, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useCan } from "@/components/permissions-context";

const TABS = ["Send Greeting", "Template Management"] as const;

export default function Greetings() {
    const [loading, setLoading] = useState(true);
    const can = useCan();
    const [tab, setTab] = useState<(typeof TABS)[number]>("Send Greeting");
    const [templates, setTemplates] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [f, setF] = useState<any>({
        name: "",
        subject: "",
        body: "",
        channel: "EMAIL",
    });
    const [send, setSend] = useState<any>({
        patientId: "",
        templateId: "",
    });

    const load = () => {
        setLoading(true);
        return fetch("/api/greetings/templates")
            .then((r) => r.json())
            .then(setTemplates)
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
        fetch("/api/patients")
            .then((r) => r.json())
            .then(setPatients);
    }, []);

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

    const doSend = async () => {
        const r = await fetch("/api/greetings/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(send),
        });

        const d = await r.json();

        if (d.status === "SENT") toast.success("Message sent");
        else toast.error("Message processed: " + (d.error || d.status));
    };

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Greetings</h1>

                <p className="text-sm text-slate-500">
                    Send greetings and manage message templates.
                </p>
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
                <Card className="max-w-2xl p-5">
                    <div className="space-y-3">
                        <div>
                            <Label required>Patient</Label>

                            <SearchSelect
                                options={patients.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} — ${p.phone}`,
                                }))}
                                value={send.patientId}
                                onChange={(v) =>
                                    setSend({ ...send, patientId: v })
                                }
                                placeholder="Search patient by name or phone..."
                            />
                        </div>

                        <div>
                            <Label required>Template</Label>

                            <select
                                className="input"
                                value={send.templateId}
                                onChange={(e) =>
                                    setSend({
                                        ...send,
                                        templateId: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select</option>

                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.channel})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {can("GREETING.C") && (
                            <Button className="w-full" onClick={doSend}>
                                <Send size={16} className="mr-1.5" />
                                Send Message
                            </Button>
                        )}
                    </div>
                </Card>
            )}

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
