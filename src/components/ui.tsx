import React from "react";
import { X } from "lucide-react";
export function Button({className="",variant="primary",...p}: React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?: "primary"|"secondary"}) {
  return <button className={`${variant==="primary"?"btn-primary":"btn-secondary"} ${className}`} {...p}/>;
}
export function Card({className="",...p}: React.HTMLAttributes<HTMLDivElement>) { return <div className={`card ${className}`} {...p}/>; }
export function Input({className="",...p}: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={`input ${className}`} {...p}/>; }
export function Label({children,required}:{children:React.ReactNode;required?:boolean}) { return <label className="label">{children}{required && <span className="ml-0.5 text-red-500">*</span>}</label>; }
export function Badge({children}:{children:React.ReactNode}) { return <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{children}</span>; }
export function Textarea({className="",...p}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`input min-h-[80px] resize-y ${className}`} {...p}/>; }
export function SearchSelect({
  options, value, onChange, placeholder = "Search...", required,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        placeholder={placeholder}
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        required={required && !value}
      />
      {open && (
        <div className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 ${o.value === value ? "bg-teal-50 font-medium text-teal-700" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No match found</div>
          )}
        </div>
      )}
    </div>
  );
}
export function Modal({open,title,onClose,children,wide}:{open:boolean;title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  if(!open) return null;
  return (
    // clicking outside does not close: only the X or Cancel buttons do
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`card max-h-[90vh] w-full ${wide?"max-w-4xl":"max-w-2xl"} overflow-y-auto p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pagination({
  page, totalPages, onPage,
}: { page: number; totalPages: number; onPage: (p: number) => void }) {
  // windowed page numbers: 1 ... p-1 p p+1 ... last
  const pages: (number | "...")[] = [];
  const add = (n: number | "...") => pages[pages.length - 1] !== n && pages.push(n);
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) add(n);
    else add("...");
  }
  return (
    <div className="flex items-center gap-1">
      <button
        className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        &lsaquo; Prev
      </button>
      {pages.map((n, i) =>
        n === "..." ? (
          <span key={`e${i}`} className="px-1.5 text-sm text-slate-400">…</span>
        ) : (
          <button
            key={n}
            className={`min-w-[34px] rounded-lg px-2 py-1.5 text-sm ${
              n === page
                ? "bg-teal-600 font-semibold text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => n !== page && onPage(n)}
          >
            {n}
          </button>
        )
      )}
      <button
        className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next &rsaquo;
      </button>
    </div>
  );
}
