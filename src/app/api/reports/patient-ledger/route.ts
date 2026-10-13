import { bad, ok, requireSession } from "@/lib/api";
import { buildLedger } from "@/lib/reports/ledger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const data = await buildLedger(new URL(req.url).searchParams);
  if (!data) return bad("Select a patient or a ledger head.");
  return ok(data);
}
