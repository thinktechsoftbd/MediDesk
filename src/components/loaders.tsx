import { Loader2 } from "lucide-react";

// Spinner row shown inside a table body while its data loads
export function TableLoader({ colSpan, text = "Loading..." }: { colSpan: number; text?: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="p-10">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 size={18} className="animate-spin text-teal-600" />
                    {text}
                </div>
            </td>
        </tr>
    );
}

// Same spinner for non-table content (cards, trees)
export function BlockLoader({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-teal-600" />
            {text}
        </div>
    );
}
