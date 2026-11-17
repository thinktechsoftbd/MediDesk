import { ok } from "@/lib/api";
import { denyUnless } from "@/lib/permissions";
import { buildFinanceDesk } from "@/lib/finance-desk";

export const dynamic = "force-dynamic";

// Finance Desk figures: see buildFinanceDesk
export async function GET() {
    { const denied = await denyUnless("PAYMENT.V"); if (denied) return denied; }
    return ok(await buildFinanceDesk());
}
