import { bad, ok, requireSession } from "@/lib/api";
import { buildBalanceSheet } from "@/lib/reports/balance-sheet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  return ok(await buildBalanceSheet({ asOf: sp.get("asOf")?.trim() || "", postedOnly: sp.get("postedOnly") === "1" }));
}
