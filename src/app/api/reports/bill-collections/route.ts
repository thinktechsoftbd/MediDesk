import { bad, ok, requireSession } from "@/lib/api";
import { buildBillCollections, paramsFrom } from "@/lib/reports/bill-collections";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    try {
        return ok(await buildBillCollections(paramsFrom(new URL(req.url).searchParams)));
    } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("sp_bill_collection_report"))
            return bad("Report procedure is missing. Run: npx prisma db execute --file prisma/sql/patient_x_agreement.sql --schema prisma/schema.prisma", 500);
        return bad("Failed to run report: " + msg.split("\n").pop(), 500);
    }
}
