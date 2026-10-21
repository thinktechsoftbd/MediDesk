import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { denyUnlessAny } from "@/lib/permissions";
import { cleanDirections, legacyText } from "@/lib/rx-directions";
import { FindingCategory, SECTIONS, isCategory, joinFindings } from "@/lib/clinical-findings";

// The case's Rx for the prescription page: case + patient + medicine lines in order
// + the clinical items picked for it (complaints, O/E, advice...).
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const c = await db.caseHistory.findUnique({
        where: { id: Number(params.id) },
        include: {
            patient: true,
            prescriptions: {
                orderBy: { id: "asc" },
                include: { items: { orderBy: { id: "asc" }, include: { medicine: true } } },
            },
            findings: { orderBy: { sortOrder: "asc" } },
        },
    });
    return c ? ok(c) : bad("Case not found", 404);
}

// Replace the case's Rx lines. body: { items: [{ medicineId, directions }],
//   findings?: [{ category, term, note }], followUpDate?: "YYYY-MM-DD" | null, toothNumber?: string,
//   adviceTooth?: string, ageGroup?: "ADULT" | "CHILD", bp?: string }
// findings replace the case's clinical items and rewrite problem / oe / treatment / details
// from them; the other fields, when sent, set the next visit, the teeth under O/E and under
// Advice, which tooth chart (adult / child) the case uses and the blood pressure.
// Medicines used to be edited on the case form, so case editors may save here too.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    { const denied = await denyUnlessAny(["PRESCRIPTION.C", "CASE.E"]); if (denied) return denied; }
    const caseId = Number(params.id);
    const c = await db.caseHistory.findUnique({ where: { id: caseId }, select: { id: true, patientId: true, problem: true, followUpDate: true } });
    if (!c) return bad("Case not found", 404);

    const b = await parseBody(req);
    const lines: any[] = Array.isArray(b?.items) ? b.items : [];
    if (lines.some((l) => !Number(l?.medicineId))) return bad("Every Rx line needs a medicine.");
    const items = lines.map((l) => {
        const directions = cleanDirections(l.directions);
        return { medicineId: Number(l.medicineId), directions: directions ?? undefined, ...legacyText(directions) };
    });

    const found = await db.medicine.count({ where: { id: { in: Array.from(new Set(items.map((i) => i.medicineId))) } } });
    if (found !== new Set(items.map((i) => i.medicineId)).size) return bad("A medicine on the Rx no longer exists. Remove it and add it again.");

    // clinical items, and the case text built from them
    let findings: { category: string; term: string; note: string | null; sortOrder: number }[] | null = null;
    const caseData: any = {};
    let diagnosis = c.problem;
    if (Array.isArray(b?.findings)) {
        findings = [];
        for (const f of b.findings) {
            const term = String(f?.term ?? "").trim().replace(/\s+/g, " ");
            if (!isCategory(f?.category) || !term) return bad("Every clinical item needs a section and a name.");
            if (term.length > 500) return bad(`"${term.slice(0, 40)}..." is too long.`);
            findings.push({ category: f.category, term, note: String(f?.note ?? "").trim().slice(0, 200) || null, sortOrder: findings.length });
        }
        const text = (key: FindingCategory) =>
            joinFindings(key, findings!.filter((f) => f.category === key).map((f) => ({ term: f.term, note: f.note || "" })));
        for (const s of SECTIONS) if (s.field) caseData[s.field] = text(s.key) || null;
        if ((caseData.oe || "").length > 1000) return bad("On Examination is too long to save (1000 characters at most).");
        diagnosis = (text("DIAGNOSIS") || caseData.problem || "").replace(/\n/g, ", ") || null;
    }
    if (b && "followUpDate" in b) {
        const v = b.followUpDate ? String(b.followUpDate).slice(0, 10) : null;
        if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v).getTime()))) return bad("Invalid follow-up date.");
        caseData.followUpDate = v ? new Date(v) : null;
        // a new date gets a new follow-up SMS (as on the case form)
        if (v !== (c.followUpDate ? c.followUpDate.toISOString().slice(0, 10) : null)) caseData.followUpSmsSentAt = null;
    }
    // teeth from the tooth charts under On Examination and Advice (FDI codes, e.g. "16, 26")
    for (const key of ["toothNumber", "adviceTooth"]) {
        if (!b || !(key in b)) continue;
        const t = String(b[key] ?? "").trim();
        if (t.length > 300) return bad("Too many teeth selected.");
        caseData[key] = t || null;
    }
    if (b && "bp" in b) {
        const v = String(b.bp ?? "").trim();
        if (v.length > 20) return bad("B/P can be at most 20 characters.");
        caseData.bp = v || null;
    }
    // Adult / Child tooth chart of this case (the patient's own ageGroup is left alone)
    if (b && "ageGroup" in b) caseData.ageGroup = ["ADULT", "CHILD"].includes(b.ageGroup) ? b.ageGroup : null;

    await db.$transaction(async (tx: any) => {
        if (findings) {
            await tx.caseFinding.deleteMany({ where: { caseHistoryId: caseId } });
            if (findings.length) await tx.caseFinding.createMany({ data: findings.map((f) => ({ ...f, caseHistoryId: caseId })) });
        }
        if (Object.keys(caseData).length) await tx.caseHistory.update({ where: { id: caseId }, data: caseData });

        const existing = await tx.prescription.findMany({ where: { caseHistoryId: caseId }, orderBy: { id: "asc" } });
        const [keep, ...extra] = existing;
        if (extra.length) await tx.prescription.deleteMany({ where: { id: { in: extra.map((p: any) => p.id) } } });
        if (!items.length) {
            if (keep) await tx.prescription.delete({ where: { id: keep.id } });
            return;
        }
        if (keep) {
            await tx.prescriptionItem.deleteMany({ where: { prescriptionId: keep.id } });
            await tx.prescription.update({ where: { id: keep.id }, data: { diagnosis, prescribedAt: new Date() } });
            // one by one so ids follow the Rx order
            for (const it of items) await tx.prescriptionItem.create({ data: { ...it, prescriptionId: keep.id } });
        } else {
            const p = await tx.prescription.create({ data: { patientId: c.patientId, caseHistoryId: caseId, diagnosis } });
            for (const it of items) await tx.prescriptionItem.create({ data: { ...it, prescriptionId: p.id } });
        }
    });
    return ok({ saved: items.length, findings: findings?.length ?? null });
}
