import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

// Save the doctor's dosage / duration / instructions as a medicine's defaults.
// body: { items: [{ id, dosage, duration, instructions }] }
export async function POST(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const b = await parseBody(req);
    const items: any[] = Array.isArray(b?.items) ? b.items : [];
    if (!items.length) return bad("Nothing to save.");
    const clean = (v: any) => (String(v ?? "").trim() || null);
    await db.$transaction(
        items.map((x) =>
            db.medicine.update({
                where: { id: Number(x.id) },
                data: { dosage: clean(x.dosage), duration: clean(x.duration), instructions: clean(x.instructions) },
            })
        )
    );
    return ok({ updated: items.length });
}
