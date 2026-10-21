import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";
import { MANUAL_ID_START } from "@/lib/medicine-label";

// "Commonly used drugs" on the Add Medicine popup: most prescribed first, then
// medicines with saved default directions, then hand-added ones (?limit=, default 40)
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 40));

    const used = await db.prescriptionItem.groupBy({
        by: ["medicineId"],
        _count: { medicineId: true },
        orderBy: { _count: { medicineId: "desc" } },
        take: limit,
    });
    const ids: number[] = used.map((u: any) => u.medicineId);

    if (ids.length < limit) {
        const more = await db.medicine.findMany({
            where: {
                id: { notIn: ids },
                OR: [{ directions: { not: Prisma.DbNull } }, { dosage: { not: null } }, { id: { gt: MANUAL_ID_START } }],
            },
            select: { id: true },
            orderBy: [{ name: "asc" }, { strength: "asc" }],
            take: limit - ids.length,
        });
        ids.push(...more.map((m: any) => m.id));
    }

    const rows = await db.medicine.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((m: any) => [m.id, m]));
    return ok(ids.map((id) => byId.get(id)).filter(Boolean));
}
