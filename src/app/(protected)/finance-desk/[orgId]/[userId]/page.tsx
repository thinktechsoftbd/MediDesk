import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { financeDeskPath } from "@/lib/finance-desk";
import FinanceDeskView from "./finance-desk-view";

export const dynamic = "force-dynamic";

// /finance-desk/{organization object_id}/{user object_id}. Another organization's or user's link
// goes on to the signed-in user's own (the figures are the clinic's, whoever opens them).
export default async function FinanceDesk({ params }: { params: { orgId: string; userId: string } }) {
    const session: any = await getSession();
    if (!session) redirect("/login");
    const path = await financeDeskPath(Number(session.user?.id));
    if (path && path !== `/finance-desk/${params.orgId.toLowerCase()}/${params.userId.toLowerCase()}`) redirect(path);
    return <FinanceDeskView />;
}
