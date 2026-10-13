import { db } from "@/lib/prisma";

// always run at request time, never during build prerender
export const dynamic = "force-dynamic";
import { ok } from "@/lib/api";

// Branding endpoint for sidebar/topbar. Auto-creates the default
// organization if the table is empty, so the app always has one.
export async function GET() {
  let org = await db.organization.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  if (!org) {
    org = await db.organization.create({
      data: {
        nameEn: "Mohonto Dental Care",
        nameBn: "Mohonto Dental Care",
        slogan: null,
        code: "MDC-001",
        isActive: true,
      },
    });
  }
  return ok(org);
}
