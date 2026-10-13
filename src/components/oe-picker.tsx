"use client";

import { useEffect, useRef, useState } from "react";

// O/E field: type to filter the O/E master list and pick one.
// The case stores the disease NAME (text), not the id.
export default function OePicker({
    value,
    options,
    onChange,
    onPick,
}: {
    value: string;
    options: any[];
    onChange: (text: string) => void;
    onPick: (disease: any) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const q = value.trim().toLowerCase();
    const list = q ? options.filter((o) => o.diseaseName.toLowerCase().includes(q)) : options;

    return (
        <div className="relative" ref={ref}>
            <input
                className="input"
                value={value}
                placeholder="Search O/E finding..."
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
            />
            {open && (
                <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                    {list.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            className={`block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                                o.diseaseName.toLowerCase() === q ? "bg-teal-50 font-medium text-teal-700" : ""
                            }`}
                            onClick={() => {
                                onPick(o);
                                setOpen(false);
                            }}
                        >
                            <div>{o.diseaseName}</div>
                            {o.remarks && <div className="truncate text-xs text-slate-500">{o.remarks}</div>}
                        </button>
                    ))}
                    {list.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-500">
                            Not in the O/E list. Add it under Settings › Oral Examination.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
