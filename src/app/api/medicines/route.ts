import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
import { medicineData, MANUAL_ID_START } from "@/lib/medicine-label";

// Medicine master: ?q= searches brand, generic and company. With page/pageSize returns {items,total};
// without, returns up to `limit` rows (default 30) for pickers.
export async function GET(req: Request) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const dosageForm = sp.get("dosageForm")?.trim() ?? "";
  const segment = sp.get("segment")?.trim() ?? "";
  const company = sp.get("company")?.trim() ?? "";
  const where: any = {};
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" as const } },
    { genericName: { contains: q, mode: "insensitive" as const } },
    { company: { contains: q, mode: "insensitive" as const } },
  ];
  if (dosageForm) where.dosageForm = dosageForm;
  if (segment) where.segment = segment;
  if (company) where.company = { contains: company, mode: "insensitive" as const };

  // distinct values for the filter dropdowns
  if (sp.get("facets") === "1") {
    const [forms, segments] = await Promise.all([
      db.medicine.findMany({ where: { dosageForm: { not: null } }, distinct: ["dosageForm"], select: { dosageForm: true }, orderBy: { dosageForm: "asc" } }),
      db.medicine.findMany({ where: { segment: { not: null } }, distinct: ["segment"], select: { segment: true }, orderBy: { segment: "asc" } }),
    ]);
    return ok({ dosageForms: forms.map((x: any) => x.dosageForm), segments: segments.map((x: any) => x.segment) });
  }

  const orderBy = [{ name: "asc" as const }, { strength: "asc" as const }];
  const pageParam = sp.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.medicine.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      db.medicine.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  }
  const ids = (sp.get("ids") || "").split(",").map(Number).filter(Boolean);
  if (ids.length) return ok(await db.medicine.findMany({ where: { id: { in: ids } } }));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 30));
  return ok(await db.medicine.findMany({ where, orderBy, take: limit }));
}

export async function POST(req: Request) {
  if (!(await requireSession())) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.name?.trim()) return bad("Brand Name is required.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const max = await db.medicine.aggregate({ _max: { id: true } });
    const id = Math.max(Number(max._max.id || 0), MANUAL_ID_START) + 1;
    try {
      return ok(await db.medicine.create({ data: { id, ...medicineData(b), priceText: b.priceAmount ? `৳ ${Number(b.priceAmount).toFixed(2)}` : null, scrapedAt: new Date() } }), 201);
    } catch (e: any) {
      if (e?.code !== "P2002") return bad("Save failed: " + (e?.message?.split("\n").pop() || "unknown error"), 500);
    }
  }
  return bad("Could not assign a medicine id, try again.", 500);
}
