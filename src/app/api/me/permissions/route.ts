import { bad, ok, requireSession } from "@/lib/api";
import { getPermissionCodes } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    return ok({ codes: await getPermissionCodes(Number(session.user?.id)) });
}
