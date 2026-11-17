import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { financeDeskPath } from "@/lib/finance-desk";

export const dynamic = "force-dynamic";

// The menu links here: on to the signed-in user's own /finance-desk/{organization}/{user}
export default async function FinanceDeskHome() {
    const session: any = await getSession();
    if (!session) redirect("/login");
    const path = await financeDeskPath(Number(session.user?.id));
    redirect(path || "/dashboard");
}
