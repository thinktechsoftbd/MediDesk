import { bad, ok, requireSession } from "@/lib/api";
import { FOLLOW_UP_SMS, loadVisit } from "@/lib/patient-visit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The patient behind /patient/{objectId}/patient-visit (which opens their prescription page), and whether a new
// follow-up date there gets an SMS: { patient, hasAgreement, totalCollected, smsMinCollected, mobile, smsEligible }
export async function GET(_req: Request, { params }: { params: { objectId: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    if (!UUID.test(params.objectId)) return bad("Patient not found.", 404);
    const visit = await loadVisit(params.objectId);
    if (!visit) return bad("Patient not found.", 404);
    return ok({ ...visit, smsText: FOLLOW_UP_SMS });
}
