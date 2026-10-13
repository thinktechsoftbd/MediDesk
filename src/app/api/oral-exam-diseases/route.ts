import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export const dynamic = "force-dynamic";

// O/E findings master: ?q= searches name and remarks
export async function GET(req: Request) {
    if (!(await requireSession())) return bad("Unauthorized", 401);
    const q = new URL(req.url).searchParams.get("q")?.trim() || "";
    const where: any = q
        ? { OR: [{ diseaseName: { contains: q, mode: "insensitive" } }, { remarks: { contains: q, mode: "insensitive" } }] }
        : {};
    return ok(await db.oralExamDisease.findMany({ where, orderBy: { diseaseName: "asc" } }));
}

export async function POST(req: Request) {
    const session: any = await requireSession();
    if (!session) return bad("Unauthorized", 401);
    const b = await parseBody(req);
    const diseaseName = String(b?.diseaseName || "").trim();
    if (!diseaseName) return bad("Disease name is required.");
    if (diseaseName.length > 150) return bad("Disease name can be at most 150 characters.");
    const remarks = String(b?.remarks || "").trim().slice(0, 250) || null;

    // id has no default in the table: next number, retry if two saves race
    for (let attempt = 0; attempt < 3; attempt++) {
        const max = await db.oralExamDisease.aggregate({ _max: { id: true } });
        try {
            const row = await db.oralExamDisease.create({
                data: { id: Number(max._max.id || 0) + 1, diseaseName, remarks, createdBy: Number(session.user?.id) || null },
            });
            return ok(row, 201);
        } catch (e: any) {
            if (e?.code === "P2002" && String(e?.meta?.target || "").includes("disease_name"))
                return bad("This disease name already exists.");
            if (e?.code !== "P2002") return bad("Save failed.", 500);
        }
    }
    return bad("Could not assign an id, try again.", 500);
}
