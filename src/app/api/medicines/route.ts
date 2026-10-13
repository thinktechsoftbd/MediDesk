import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const dosageForm = sp.get("dosageForm")?.trim() ?? "";
  const manufacturerType = sp.get("manufacturerType")?.trim() ?? "";
  const where: any = {};
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" as const } },
    { dosageForm: { contains: q, mode: "insensitive" as const } },
    { treatmentUse: { contains: q, mode: "insensitive" as const } },
  ];
  if (dosageForm) where.dosageForm = dosageForm;
  if (manufacturerType) where.manufacturerType = manufacturerType;

  const pageParam = sp.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.medicine.findMany({
        where,
        orderBy: [{ name: "asc" }, { strength: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.medicine.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  }
  return ok(await db.medicine.findMany({ where, orderBy: [{ name: "asc" }, { strength: "asc" }] }));
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  if (!b?.name?.trim()) return bad("Medicine Name is required.");
  return ok(await db.medicine.create({ data: {
    name: b.name.trim(),
    strength: b.strength?.trim() || null,
    unit: b.unit?.trim() || null,
    dosageForm: b.dosageForm?.trim() || null,
    manufacturerType: b.manufacturerType?.trim() || null,
    treatmentUse: b.treatmentUse?.trim() || null,
    createdBy: session.user?.email || session.user?.name || null,
  }}), 201);
}
