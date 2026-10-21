import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { cleanDirections, legacyText } from "@/lib/rx-directions";

// Save the doctor's dosage / duration / instructions as a medicine's defaults.
// body: { items: [{ id, dosage, duration, instructions }] }
//    or { items: [{ id, directions }] } from the Rx page dose editor (text columns filled from it)
export async function POST(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const b = await parseBody(req);
    const items: any[] = Array.isArray(b?.items) ? b.items : [];
    if (!items.length) return bad("Nothing to save.");
    const clean = (v: any) => (String(v ?? "").trim() || null);
    await db.$transaction(
        items.map((x) => {
            const directions = x.directions !== undefined ? cleanDirections(x.directions) : undefined;
            if (directions !== undefined) {
                const t = legacyText(directions);
                return db.medicine.update({
                    where: { id: Number(x.id) },
                    data: {
                        directions: directions ?? Prisma.DbNull,
                        dosage: t.dosage === "-" ? null : t.dosage,
                        duration: t.duration === "-" ? null : t.duration,
                        instructions: t.instructions,
                    },
                });
            }
            return db.medicine.update({
                where: { id: Number(x.id) },
                // typed text replaces any structured defaults
                data: { dosage: clean(x.dosage), duration: clean(x.duration), instructions: clean(x.instructions), directions: Prisma.DbNull },
            });
        })
    );
    return ok({ updated: items.length });
}
