import { db } from "@/lib/prisma";
import { bad, ok, requireSession } from "@/lib/api";

// Full chart of accounts tree:
// Parent Class -> AC Class -> Main Class -> Map Class -> Sub Class
export async function GET() {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const tree = await db.accAcParentClass.findMany({
    orderBy: { parentCode: "asc" },
    include: {
      acClasses: {
        orderBy: { acCode: "asc" },
        include: {
          mainClasses: {
            orderBy: [{ mcDisplayOrder: "asc" }, { mainCode: "asc" }],
            include: {
              mapClasses: {
                orderBy: { mapCode: "asc" },
                include: {
                  subClasses: { orderBy: { subCode: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  return ok(tree);
}
