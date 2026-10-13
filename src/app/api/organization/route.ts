import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

export async function GET(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const pageParam = sp.get("page");
  if (pageParam) {
    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 10));
    const [items, total] = await Promise.all([
      db.organization.findMany({ orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      db.organization.count(),
    ]);
    return ok({ items, total, page, pageSize });
  }
  const orgs = await db.organization.findMany({ orderBy: { id: "asc" } });
  return ok(orgs);
}

export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const body = await parseBody(req);
  if (!body?.nameEn) return bad("Organization Name (EN) is required.");
  const org = await db.organization.create({ data: {
    nameEn: body.nameEn, nameBn: body.nameBn || null, slogan: body.slogan || null,
    code: body.code || null, email: body.email || null, phone: body.phone || null,
    website: body.website || null, addressLine1: body.addressLine1 || null,
    addressLine2: body.addressLine2 || null, city: body.city || null,
    state: body.state || null, postalCode: body.postalCode || null,
    country: body.country || null, logoUrl: body.logoUrl || null,
    isActive: body.isActive ?? true,
  }});
  return ok(org, 201);
}
