"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, BookmarkPlus, FileText, Pencil, Plus, Printer, Save, Search, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card } from "@/components/ui";
import { BlockLoader } from "@/components/loaders";
import { useCan } from "@/components/permissions-context";
import RxLine from "@/components/rx/rx-line";
import AddMedicineModal from "@/components/rx/add-medicine-modal";
import DoseEditorModal from "@/components/rx/dose-editor-modal";
import FindingPickerModal from "@/components/rx/finding-picker-modal";
import QuickCollection from "@/components/rx/quick-collection";
import ToothChart from "@/components/tooth-chart";
import { Directions, directionsOf, isEmptyDirections } from "@/lib/rx-directions";
import { FindingCategory, FindingItem, SECTIONS, itemsByCategory } from "@/lib/clinical-findings";

type Line = { key: string; medicine: any; directions: Directions | null };
// the dose editor works on a line of the Rx (index) or a medicine about to be added (index null)
type Editing = { index: number | null; medicine: any; directions: Directions | null };
type Findings = Record<FindingCategory, FindingItem[]>;

const fmtDate = (iso?: string | null) => {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
};
const fmtShort = (iso?: string | null) => (iso ? fmtDate(iso).replace(/\/(\d\d)(\d\d)$/, "/$2") : "");
let seq = 0;
const newKey = () => `l${++seq}`;

// Next follow-up: N days / months / years from today, as YYYY-MM-DD
type Unit = "day" | "month" | "year";
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const after = (n: number, unit: Unit) => {
    const d = new Date();
    if (unit === "day") d.setDate(d.getDate() + n);
    else if (unit === "month") d.setMonth(d.getMonth() + n);
    else d.setFullYear(d.getFullYear() + n);
    return ymd(d);
};
const QUICK_DAYS = [1, 7, 15, 30, 90, 180];
const weekday = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
const daysFromToday = (s: string) => Math.round((new Date(`${s}T00:00:00`).getTime() - new Date(`${ymd(new Date())}T00:00:00`).getTime()) / 86400000);

export default function PrescriptionPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const can = useCan();
    const canWrite = can("PRESCRIPTION.C") || can("CASE.E");

    const [c, setC] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lines, setLines] = useState<Line[]>([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const [common, setCommon] = useState<any[]>([]);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Editing | null>(null);

    const [templates, setTemplates] = useState<any[]>([]);
    const [tplQ, setTplQ] = useState("");
    const [tplName, setTplName] = useState("");

    // clinical sections (complaints, O/E, advice...) and next follow-up, saved with the Rx
    const [findings, setFindings] = useState<Findings>(() => itemsByCategory(null));
    const [followUp, setFollowUp] = useState(""); // YYYY-MM-DD
    const [tooth, setTooth] = useState(""); // case toothNumber, e.g. "16, 26" (FDI)
    const [adviceTooth, setAdviceTooth] = useState(""); // teeth picked under Advice
    const [bp, setBp] = useState(""); // blood pressure, e.g. "120/80"
    // tooth chart: the case's own choice, else the patient's registration (Adult by default)
    const [ageGroup, setAgeGroup] = useState<"ADULT" | "CHILD">("ADULT");
    const [terms, setTerms] = useState<any[]>([]);
    const [picker, setPicker] = useState<FindingCategory | null>(null);
    const [afterN, setAfterN] = useState("");
    const [afterUnit, setAfterUnit] = useState<Unit>("day");

    const change = (fn: (prev: Line[]) => Line[]) => {
        setLines(fn);
        setDirty(true);
    };

    const changeClinical = () => setDirty(true);
    const setSection = (key: FindingCategory, items: FindingItem[]) => {
        setFindings((prev) => ({ ...prev, [key]: items }));
        changeClinical();
    };

    // lines: reset the Rx from the server; clinical: reset the sections and follow-up
    const loadCase = useCallback(
        (opts: { lines?: boolean; clinical?: boolean } = {}) =>
            fetch(`/api/cases/${id}/prescription`)
                .then((r) => r.json())
                .then((d) => {
                    if (d?.error) {
                        toast.error(d.error);
                        return;
                    }
                    setC(d);
                    if (opts.lines) {
                        const items = (d.prescriptions || []).flatMap((p: any) => p.items || []);
                        setLines(items.map((it: any) => ({ key: newKey(), medicine: it.medicine, directions: directionsOf(it) })));
                        setDirty(false);
                    }
                    if (opts.clinical) {
                        setFindings(itemsByCategory(d));
                        setFollowUp(d.followUpDate ? String(d.followUpDate).slice(0, 10) : "");
                        setTooth(d.toothNumber || "");
                        setAdviceTooth(d.adviceTooth || "");
                        setBp(d.bp || "");
                        setAgeGroup((d.ageGroup || d.patient?.ageGroup) === "CHILD" ? "CHILD" : "ADULT");
                    }
                })
                .finally(() => setLoading(false)),
        [id]
    );

    const loadCommon = () =>
        fetch("/api/medicines/common?limit=60")
            .then((r) => r.json())
            .then((d) => setCommon(Array.isArray(d) ? d : []))
            .catch(() => {});

    const loadTemplates = () =>
        fetch("/api/prescription-templates")
            .then((r) => r.json())
            .then((d) => setTemplates(Array.isArray(d) ? d : []))
            .catch(() => {});

    const loadTerms = () =>
        fetch("/api/clinical-terms")
            .then((r) => r.json())
            .then((d) => setTerms(Array.isArray(d) ? d : []))
            .catch(() => {});

    useEffect(() => {
        loadCase({ lines: true, clinical: true });
        loadCommon();
        loadTemplates();
        loadTerms();
    }, [loadCase]);

    const termsOf = (key: FindingCategory) => terms.filter((t) => t.category === key);

    // a chip clicked on a picker; an O/E with default remarks adds them to Advice too
    const addFinding = (key: FindingCategory, term: any) => {
        const next: Findings = { ...findings, [key]: [...findings[key], { term: term.name, note: "" }] };
        const remarks = key === "OE" ? String(term.remarks || "").trim() : "";
        if (remarks && !findings.ADVICE.some((a) => a.term.toLowerCase() === remarks.toLowerCase())) {
            next.ADVICE = [...findings.ADVICE, { term: remarks, note: "" }];
            toast.success("O/E default remarks added to Advice");
        }
        setFindings(next);
        changeClinical();
    };

    // a term typed on a picker that is not in its list yet
    const createTerm = async (key: FindingCategory, name: string) => {
        const r = await fetch("/api/clinical-terms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: key, name }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
            toast.error(d?.error || "Could not add the term.");
            return null;
        }
        if (!d.existed) {
            setTerms((prev) => [...prev, d]);
            toast.success(`"${d.name}" added to the list`);
        }
        return d;
    };

    const setNextVisit = (v: string) => {
        setFollowUp(v);
        changeClinical();
    };

    // leaving with unsaved Rx changes
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;
    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => {
            if (!dirtyRef.current) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, []);

    // a medicine picked on the Add Medicine popup
    const pickMedicine = (m: any) => {
        const at = lines.findIndex((l) => l.medicine?.id === m.id);
        if (at >= 0) {
            toast("Already on the Rx — edit it here", { icon: "ℹ️" });
            setEditing({ index: at, medicine: lines[at].medicine, directions: lines[at].directions });
            return;
        }
        const saved = directionsOf(m);
        if (saved && !isEmptyDirections(saved)) {
            change((prev) => [...prev, { key: newKey(), medicine: m, directions: saved }]);
            toast.success("Medicine added");
        } else setEditing({ index: null, medicine: m, directions: null });
    };

    const saveDirections = async (d: Directions, setDefault: boolean) => {
        if (!editing) return;
        const { index, medicine } = editing;
        let med = medicine;
        if (setDefault) {
            const r = await fetch("/api/medicines/defaults", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: [{ id: medicine.id, directions: d }] }),
            });
            if (r.ok) {
                toast.success(`Saved as default for ${medicine.name}`);
                med = { ...medicine, directions: d };
                loadCommon();
            } else toast.error((await r.json().catch(() => null))?.error || "Could not save the default.");
        }
        if (index === null) {
            change((prev) => [...prev, { key: newKey(), medicine: med, directions: d }]);
            toast.success("Medicine added");
        } else change((prev) => prev.map((l, i) => (i === index ? { ...l, medicine: med, directions: d } : l)));
        setEditing(null);
    };

    const move = (i: number, by: number) =>
        change((prev) => {
            const j = i + by;
            if (j < 0 || j >= prev.length) return prev;
            const next = [...prev];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });

    const payload = () => lines.map((l) => ({ medicineId: l.medicine.id, directions: l.directions }));

    // The print view in a new tab of its own ("noopener"). A tab linked to this page (opened
    // blank first, then sent to the print view) shares this page's thread, so this page froze
    // while that tab's print dialog was open. ?print=1: the print view opens the dialog itself.
    const openPrintTab = (clickedAt: number) => {
        const url = `/print/prescription/${id}?print=1`;
        // the browser allows a popup for about 5s after the click; a slower save gets a button instead
        if (Date.now() - clickedAt < 4500) {
            window.open(url, "_blank", "noopener");
            return;
        }
        toast(
            (t) => (
                <span>
                    Prescription saved.{" "}
                    <a href={url} target="_blank" rel="noopener" className="font-medium text-teal-700 underline" onClick={() => toast.dismiss(t.id)}>
                        Open print
                    </a>
                </span>
            ),
            { duration: 15000 }
        );
    };

    const save = async (print = false) => {
        if (saving) return;
        const clickedAt = Date.now();
        setSaving(true);
        const r = await fetch(`/api/cases/${id}/prescription`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: payload(),
                findings: SECTIONS.flatMap((s) => findings[s.key].map((f) => ({ category: s.key, term: f.term, note: f.note }))),
                followUpDate: followUp || null,
                toothNumber: tooth,
                adviceTooth,
                ageGroup,
                bp,
            }),
        });
        const d = await r.json().catch(() => null);
        setSaving(false);
        if (!r.ok) {
            toast.error(d?.error || "Could not save the prescription.");
            return;
        }
        setDirty(false);
        // the case as saved (C/C, O/E, advice text...)
        loadCase();
        toast.success("Prescription saved");
        if (print) openPrintTab(clickedAt);
    };

    const applyTemplate = async (t: any) => {
        if (lines.length && !confirm(`Replace the ${lines.length} medicine(s) on this Rx with template "${t.name}"?`)) return;
        const r = await fetch(`/api/prescription-templates/${t.id}`);
        const d = await r.json().catch(() => null);
        if (!r.ok) return toast.error(d?.error || "Could not load the template.");
        change(() => d.items.map((it: any) => ({ key: newKey(), medicine: it.medicine, directions: it.directions })));
        setTplName(d.name);
        toast.success(`Template "${d.name}" applied` + (d.missing ? ` (${d.missing} deleted medicine(s) skipped)` : ""));
    };

    const saveTemplate = async () => {
        const name = tplName.trim();
        if (!name) return toast.error("Type a template name first.");
        if (!lines.length) return toast.error("Add medicines before saving a template.");
        const body = JSON.stringify({ name, items: payload() });
        let r = await fetch("/api/prescription-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        let d = await r.json().catch(() => null);
        if (r.status === 409 && d?.id) {
            if (!confirm(`${d.error} Replace its medicines with this Rx?`)) return;
            r = await fetch(`/api/prescription-templates/${d.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
            d = await r.json().catch(() => null);
        }
        if (!r.ok) return toast.error(d?.error || "Could not save the template.");
        toast.success(`Template "${name}" saved`);
        loadTemplates();
    };

    const deleteTemplate = async (t: any) => {
        if (!confirm(`Delete template "${t.name}"?`)) return;
        const r = await fetch(`/api/prescription-templates/${t.id}`, { method: "DELETE" });
        if (!r.ok) return toast.error((await r.json().catch(() => null))?.error || "Could not delete the template.");
        toast.success("Template deleted");
        loadTemplates();
    };

    const shownTemplates = useMemo(() => {
        const t = tplQ.trim().toLowerCase();
        return t ? templates.filter((x) => x.name.toLowerCase().includes(t)) : templates;
    }, [templates, tplQ]);

    // a tooth chart (Adult / Child as switched under On Examination), or its teeth as text when read-only
    const teethChart = (value: string, set: (v: string) => void) =>
        canWrite ? (
            <ToothChart
                compact
                child={ageGroup === "CHILD"}
                value={value}
                onChange={(v) => {
                    set(v);
                    changeClinical();
                }}
            />
        ) : (
            <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tooth ({ageGroup === "CHILD" ? "child" : "adult"}):{" "}
                </span>
                {value || <span className="text-slate-400">—</span>}
            </div>
        );

    const rxList = (inPopup: boolean) => (
        <div className="divide-y">
            {lines.map((l, i) => (
                <RxLine
                    key={l.key}
                    no={i + 1}
                    medicine={l.medicine}
                    directions={l.directions}
                    compact={inPopup}
                    actions={
                        canWrite && (
                            <>
                                {!inPopup && (
                                    <>
                                        <IconBtn title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                                            <ArrowUp size={15} />
                                        </IconBtn>
                                        <IconBtn title="Move down" disabled={i === lines.length - 1} onClick={() => move(i, 1)}>
                                            <ArrowDown size={15} />
                                        </IconBtn>
                                    </>
                                )}
                                <IconBtn title="Edit dose" className="text-teal-700 hover:bg-teal-50" onClick={() => setEditing({ index: i, medicine: l.medicine, directions: l.directions })}>
                                    <Pencil size={15} />
                                </IconBtn>
                                <IconBtn title="Remove" className="text-red-600 hover:bg-red-50" onClick={() => change((prev) => prev.filter((_, j) => j !== i))}>
                                    <XCircle size={15} />
                                </IconBtn>
                            </>
                        )
                    }
                />
            ))}
            {!lines.length && <p className="py-6 text-center text-sm text-slate-500">No medicines yet.{canWrite && " Click + to add."}</p>}
        </div>
    );

    if (loading && !c) return <BlockLoader />;
    if (!c) return <p className="p-6 text-slate-500">Case not found.</p>;
    const p = c.patient || {};
    const caseLabel = `Case-${String(c.caseNo).padStart(2, "0")}`;

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Prescription</h1>
                    <p className="text-sm text-slate-500">
                        <b className="text-slate-700">{p.name}</b> ({p.patientNo})
                        {p.age != null && ` · ${p.age} yrs`}
                        {p.gender && ` · ${String(p.gender).charAt(0)}${String(p.gender).slice(1).toLowerCase()}`}
                        {` · ${caseLabel} · ${fmtDate(c.caseDate)}`}
                    </p>
                </div>
                {can("PAYMENT.V") && <QuickCollection patientId={c.patientId} caseId={c.id} caseLabel={caseLabel} />}
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/cases/patient/${c.patientId}`)}>
                        <ArrowLeft size={16} className="mr-1.5" />
                        Case History
                    </Button>
                    <a className="btn-secondary" href={`/print/prescription/${id}`} target="_blank" title={dirty ? "Save first to print the latest changes" : "Open the print view"}>
                        <FileText size={16} className="mr-1.5" />
                        Print View
                    </a>
                    {canWrite && (
                        <>
                            <Button variant="secondary" disabled={saving} onClick={() => save(false)} className={dirty ? "!bg-amber-100 !text-amber-800" : ""}>
                                <Save size={16} className="mr-1.5" />
                                {dirty ? "Save*" : "Save"}
                            </Button>
                            <Button disabled={saving} onClick={() => save(true)}>
                                <Printer size={16} className="mr-1.5" />
                                Save + Print
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                {/* templates */}
                <Card className="h-fit p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-700">Templates</div>
                    <div className="relative mb-2">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input className="input !py-1.5 !pl-7" placeholder="Search..." value={tplQ} onChange={(e) => setTplQ(e.target.value)} />
                    </div>
                    <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
                        {shownTemplates.map((t) => (
                            <div key={t.id} className="group flex items-start rounded-lg border hover:border-teal-300 hover:bg-teal-50/50">
                                <button
                                    type="button"
                                    className="min-w-0 flex-1 px-2.5 py-1.5 text-left disabled:cursor-not-allowed"
                                    disabled={!canWrite}
                                    onClick={() => applyTemplate(t)}
                                    title={canWrite ? "Apply to this Rx" : ""}
                                >
                                    <div className="truncate text-sm font-medium">{t.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {t.count} med · Updated: {fmtShort(t.updatedAt)}
                                    </div>
                                </button>
                                {canWrite && (
                                    <button
                                        type="button"
                                        className="m-1 hidden rounded p-1 text-red-600 hover:bg-red-50 group-hover:block"
                                        title="Delete template"
                                        onClick={() => deleteTemplate(t)}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {!shownTemplates.length && (
                            <p className="px-1 py-2 text-xs text-slate-500">
                                {templates.length ? "No match." : "No templates yet. Build an Rx and use Save as Template."}
                            </p>
                        )}
                    </div>
                </Card>

                <Card className="p-5">
                    {/* left column at least 300px so the tooth chart fits */}
                    <div className="grid gap-6 md:grid-cols-[minmax(300px,2fr)_minmax(0,3fr)]">
                        {/* clinical sections, picked from chip lists */}
                        <div className="space-y-4 text-sm md:border-r md:pr-5">
                            {SECTIONS.map((s) => (
                                <div key={s.key} className="space-y-2">
                                    <FindingSection
                                        title={s.title}
                                        items={findings[s.key]}
                                        onAdd={canWrite ? () => setPicker(s.key) : undefined}
                                        onRemove={canWrite ? (i) => setSection(s.key, findings[s.key].filter((_, j) => j !== i)) : undefined}
                                    />
                                    {/* teeth examined, saved as the case's Tooth Number */}
                                    {s.key === "OE" &&
                                        (canWrite ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teeth</span>
                                                    <div className="inline-flex rounded-lg border p-0.5" role="radiogroup" aria-label="Adult or child teeth">
                                                        {(["ADULT", "CHILD"] as const).map((g) => (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={ageGroup === g}
                                                                onClick={() => {
                                                                    if (ageGroup === g) return;
                                                                    setAgeGroup(g);
                                                                    changeClinical();
                                                                }}
                                                                className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${
                                                                    ageGroup === g ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"
                                                                }`}
                                                            >
                                                                {g === "ADULT" ? "Adult" : "Child"}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {teethChart(tooth, setTooth)}
                                            </>
                                        ) : (
                                            teethChart(tooth, setTooth)
                                        ))}
                                    {/* teeth the advice is for (same Adult / Child chart as above) */}
                                    {s.key === "ADVICE" && (
                                        <>
                                            {canWrite && (
                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teeth</div>
                                            )}
                                            {teethChart(adviceTooth, setAdviceTooth)}
                                        </>
                                    )}
                                </div>
                            ))}

                            <div className="flex items-center gap-2 border-t pt-3">
                                <label htmlFor="rx-bp" className="font-semibold text-slate-700">
                                    B/P
                                </label>
                                {canWrite ? (
                                    <input
                                        id="rx-bp"
                                        className="input !w-28 !py-1"
                                        placeholder="120/80"
                                        maxLength={20}
                                        value={bp}
                                        onChange={(e) => {
                                            setBp(e.target.value);
                                            changeClinical();
                                        }}
                                    />
                                ) : (
                                    <span className={bp ? "" : "text-slate-400"}>{bp || "—"}</span>
                                )}
                                <span className="text-xs text-slate-500">mmHg</span>
                            </div>

                            <div className="border-t pt-3">
                                <div className="mb-1.5 font-semibold text-slate-700">Next Follow-up</div>
                                {canWrite && (
                                    <>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_DAYS.map((n) => {
                                                const v = after(n, "day");
                                                return (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() => setNextVisit(v)}
                                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                                            followUp === v
                                                                ? "border-teal-700 bg-teal-700 text-white"
                                                                : "bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50"
                                                        }`}
                                                    >
                                                        {n} {n === 1 ? "Day" : "Days"}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs text-slate-500">After</span>
                                            <input
                                                className="input !w-16 !px-2 !py-1"
                                                type="number"
                                                min={1}
                                                max={999}
                                                value={afterN}
                                                onChange={(e) => setAfterN(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && Number(afterN) > 0 && setNextVisit(after(Number(afterN), afterUnit))}
                                            />
                                            <select className="input !w-auto !py-1" value={afterUnit} onChange={(e) => setAfterUnit(e.target.value as Unit)}>
                                                <option value="day">Days</option>
                                                <option value="month">Months</option>
                                                <option value="year">Years</option>
                                            </select>
                                            <button
                                                type="button"
                                                className="rounded-lg border px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-40"
                                                disabled={!(Number(afterN) > 0)}
                                                onClick={() => setNextVisit(after(Math.min(999, Math.floor(Number(afterN))), afterUnit))}
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    {canWrite ? (
                                        <input
                                            className="input !w-auto !py-1"
                                            type="date"
                                            value={followUp}
                                            onChange={(e) => setNextVisit(e.target.value)}
                                            title="Next follow-up date"
                                        />
                                    ) : (
                                        <span className={followUp ? "" : "text-slate-400"}>{followUp ? fmtDate(followUp) : "—"}</span>
                                    )}
                                    {followUp && (
                                        <span className="text-xs text-slate-500">
                                            {weekday(followUp)}
                                            {(() => {
                                                const n = daysFromToday(followUp);
                                                return n > 0 ? ` · in ${n} day${n === 1 ? "" : "s"}` : n === 0 ? " · today" : " · past";
                                            })()}
                                        </span>
                                    )}
                                    {canWrite && followUp && (
                                        <button type="button" className="ml-auto text-slate-400 hover:text-red-600" title="Clear follow-up" onClick={() => setNextVisit("")}>
                                            <XCircle size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rx */}
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2 border-b pb-2">
                                <span className="font-serif text-3xl leading-none">Rx</span>
                                {canWrite && (
                                    <button
                                        type="button"
                                        className="rounded-full bg-teal-700 p-1 text-white hover:bg-teal-800"
                                        title="Add medicine"
                                        onClick={() => setAddOpen(true)}
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                                {dirty && <span className="ml-auto text-xs font-medium text-amber-600">Unsaved changes</span>}
                            </div>

                            {rxList(false)}

                            {canWrite && (
                                <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
                                    <input
                                        className="input max-w-xs"
                                        placeholder="Template name"
                                        value={tplName}
                                        maxLength={100}
                                        onChange={(e) => setTplName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
                                    />
                                    <Button variant="secondary" onClick={saveTemplate}>
                                        <BookmarkPlus size={16} className="mr-1.5" />
                                        Save as Template
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <AddMedicineModal open={addOpen} onClose={() => setAddOpen(false)} onPick={pickMedicine} common={common}>
                {rxList(true)}
            </AddMedicineModal>

            {/* after the Add Medicine popup so it opens on top of it */}
            <DoseEditorModal
                open={!!editing}
                medicine={editing?.medicine}
                initial={editing?.directions ?? null}
                onClose={() => setEditing(null)}
                onSave={saveDirections}
            />

            {picker && (
                <FindingPickerModal
                    open
                    title={SECTIONS.find((s) => s.key === picker)?.title || ""}
                    terms={termsOf(picker)}
                    items={findings[picker]}
                    onAdd={(t) => addFinding(picker, t)}
                    onChange={(items) => setSection(picker, items)}
                    onCreate={(name) => createTerm(picker, name)}
                    onClose={() => setPicker(null)}
                />
            )}
        </div>
    );
}

function FindingSection({
    title,
    items,
    onAdd,
    onRemove,
}: {
    title: string;
    items: FindingItem[];
    onAdd?: () => void;
    onRemove?: (index: number) => void;
}) {
    return (
        <div>
            <div className="flex items-center justify-between gap-2 border-b pb-1">
                <span className="font-semibold text-slate-700">{title}</span>
                {onAdd && (
                    <button type="button" className="rounded-full bg-teal-700 p-0.5 text-white hover:bg-teal-800" title={`Add ${title}`} onClick={onAdd}>
                        <Plus size={14} />
                    </button>
                )}
            </div>
            <ul className="mt-1.5 space-y-1">
                {items.map((it, i) => (
                    <li key={`${it.term}-${i}`} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span className="min-w-0 flex-1 break-words text-slate-800">
                            {it.term}
                            {it.note.trim() && <i className="ml-1 text-xs text-slate-500">({it.note.trim()})</i>}
                        </span>
                        {onRemove && (
                            <button type="button" className="mt-0.5 text-slate-300 hover:text-red-600" title="Remove" onClick={() => onRemove(i)}>
                                <XCircle size={14} />
                            </button>
                        )}
                    </li>
                ))}
                {!items.length && <li className="text-xs text-slate-400">—</li>}
            </ul>
        </div>
    );
}

function IconBtn({ className = "text-slate-500 hover:bg-slate-100", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" className={`rounded-lg p-1.5 disabled:opacity-30 ${className}`} {...p} />;
}
