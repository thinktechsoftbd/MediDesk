import { Loader2 } from "lucide-react";

export default function PageLoader() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
                <Loader2 size={22} className="animate-spin text-teal-600" />
                <span className="text-sm">Loading...</span>
            </div>
        </div>
    );
}
