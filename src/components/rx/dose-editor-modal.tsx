"use client";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import RxLine, { RxName } from "@/components/rx/rx-line";
import {
    Directions,
    DoseRow,
    DUR_UNITS,
    MEALS,
    TAKE_FOR,
    TIMES,
    UNITS,
    emptyDirections,
    emptyRow,
    given,
    toEn,
} from "@/lib/rx-directions";

// Dose / meal / duration / instruction for one medicine, as on the video's Rx popup
export default function DoseEditorModal({
    open,
    medicine,
    initial,
    onClose,
    onSave,
}: {
    open: boolean;
    medicine: any;
    initial: Directions | null;
    onClose: () => void;
    onSave: (d: Directions, setDefault: boolean) => void;
}) {
    const [d, setD] = useState<Directions>(emptyDirections());
    const [setDefault, setSetDefault] = useState(false);

    useEffect(() => {
        if (!open) return;
        setD(initial ? { rows: initial.rows.length ? initial.rows.map((r) => ({ ...r })) : [emptyRow()], note: initial.note } : emptyDirections());
        setSetDefault(false);
    }, [open, initial]);

    const setRow = (i: number, patch: Partial<DoseRow>) =>
        setD((prev) => ({ ...prev, rows: prev.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

    const submit = () => onSave({ ...d, note: d.note.trim() }, setDefault);

    return (
        <Modal open={open} wide title={<RxName medicine={medicine} />} onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                {d.rows.map((r, i) => (
                    <div key={i} className="grid gap-3 rounded-xl border bg-slate-50/60 p-3 lg:grid-cols-[1.3fr_1fr_1.4fr_auto]">
                        {/* when and how much */}
                        <div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {TIMES.map((t) => (
                                    <label key={t.key} className="flex cursor-pointer items-center gap-1 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={given(r[t.key])}
                                            onChange={(e) => setRow(i, { [t.key]: e.target.checked ? "1" : "0" })}
                                        />
                                        {t.label}
                                    </label>
                                ))}
                                {TIMES.map((t) => (
                                    <input
                                        key={t.key}
                                        className="input !px-2 !py-1 text-center"
                                        value={r[t.key]}
                                        inputMode="decimal"
                                        aria-label={`${t.label} dose`}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => setRow(i, { [t.key]: e.target.value.slice(0, 6) })}
                                    />
                                ))}
                            </div>
                            <select
                                className="input mt-1.5 !py-1"
                                value={r.unit}
                                onChange={(e) => setRow(i, { unit: e.target.value })}
                                aria-label="Unit"
                            >
                                {UNITS.map((u) => (
                                    <option key={u} value={u}>
                                        {u || "Unit (none)"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* before / after meal; anything else goes in the instruction */}
                        <div>
                            <select
                                className="input"
                                value={r.meal}
                                onChange={(e) => setRow(i, { meal: e.target.value })}
                                aria-label="Meal"
                            >
                                {!MEALS.includes(r.meal) && <option value={r.meal}>{r.meal}</option>}
                                {MEALS.map((m) => (
                                    <option key={m} value={m}>
                                        {m || "— খাবার —"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* for how long */}
                        <div className="rounded-lg border bg-white p-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                <span className="text-slate-500">Take for:</span>
                                {TAKE_FOR.map((n) => (
                                    <label key={n} className="flex cursor-pointer items-center gap-0.5">
                                        <input
                                            type="checkbox"
                                            checked={r.durUnit === "day" && toEn(r.dur).trim() === String(n)}
                                            onChange={(e) => setRow(i, e.target.checked ? { dur: String(n), durUnit: "day" } : { dur: "" })}
                                        />
                                        {n}
                                    </label>
                                ))}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                <input
                                    className="input !w-20 !px-2 !py-1"
                                    placeholder="Duration"
                                    value={r.dur}
                                    inputMode="numeric"
                                    disabled={r.durUnit === "continue" || r.durUnit === "na"}
                                    onChange={(e) => setRow(i, { dur: e.target.value.slice(0, 6) })}
                                />
                                {DUR_UNITS.map((u) => (
                                    <label key={u.key} className="flex cursor-pointer items-center gap-0.5">
                                        <input
                                            type="radio"
                                            name={`durUnit-${i}`}
                                            checked={r.durUnit === u.key}
                                            onChange={() => setRow(i, { durUnit: u.key })}
                                        />
                                        {u.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start justify-end">
                            {d.rows.length > 1 && (
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                    title="Remove this schedule"
                                    onClick={() => setD((prev) => ({ ...prev, rows: prev.rows.filter((_, j) => j !== i) }))}
                                >
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    className="flex items-center text-sm font-medium text-teal-700 hover:underline"
                    onClick={() =>
                        setD((prev) => ({ ...prev, rows: [...prev.rows, emptyRow(prev.rows[prev.rows.length - 1]?.meal)] }))
                    }
                >
                    <Plus size={15} className="mr-1" />
                    Add more (another schedule, e.g. a tapering dose)
                </button>

                <div>
                    <label className="label">Instruction or custom time</label>
                    <textarea
                        className="input min-h-[60px] resize-y"
                        placeholder="e.g. ব্যথা বেশি হলে খাবেন"
                        value={d.note}
                        onChange={(e) => setD({ ...d, note: e.target.value.slice(0, 500) })}
                    />
                </div>

                <div className="rounded-xl border border-dashed px-3">
                    <div className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Preview</div>
                    <RxLine no={1} medicine={medicine} directions={d} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
                        Set as default settings for this medicine
                    </label>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            <X size={16} className="mr-1.5" />
                            Close
                        </Button>
                        <Button type="submit">
                            <Save size={16} className="mr-1.5" />
                            Update
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
