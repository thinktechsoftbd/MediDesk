import { bad, ok, requireSession } from "@/lib/api";
import { buildTrialBalance } from "@/lib/reports/trial-balance";

export const dynamic = "force-dynamic";

// Trial balance: Parent > A/C class > ledger head (> patient) with
// opening, period debit/credit and closing balance.
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const sp = new URL(req.url).searchParams;
    return ok(
        await buildTrialBalance({
            dateFrom: sp.get("dateFrom")?.trim() || "",
            dateTo: sp.get("dateTo")?.trim() || "",
            postedOnly: sp.get("postedOnly") === "1",
            showPatients: sp.get("showPatients") === "1",
            showZero: sp.get("showZero") === "1",
        })
    );
}
