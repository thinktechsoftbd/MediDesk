import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

// next numeric suffix among codes sharing a prefix
function nextSuffix(codes: (string | null)[], prefix: string, width: number) {
  let max = 0;
  for (const c of codes) {
    if (!c || !c.startsWith(prefix)) continue;
    const tail = Number(c.slice(prefix.length));
    if (!isNaN(tail) && tail > max) max = tail;
  }
  return pad(max + 1, width);
}

// Add a child under a chart-of-accounts node with an auto-generated code.
// kind = what to create: main (under AC class), map (under main), sub (under map)
export async function POST(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  const name = b?.name?.trim();
  if (!name) return bad("Name is required");
  const parentId = Number(b?.parentId || 0);
  if (!parentId) return bad("Parent is required");

  if (b.kind === "main") {
    const parent = await db.accAcClass.findUnique({ where: { id: parentId }, include: { mainClasses: true } });
    if (!parent) return bad("Parent AC class not found", 404);
    const mainCode = (parent.acCode || "") + nextSuffix(parent.mainClasses.map((m: any) => m.mainCode), parent.acCode || "", 2);
    return ok(await db.accMainClass.create({ data: {
      acCode: parent.acCode, mainCode, mainName: name, acClassId: parent.id,
    }}), 201);
  }

  if (b.kind === "map") {
    const parent = await db.accMainClass.findUnique({ where: { id: parentId }, include: { mapClasses: true } });
    if (!parent) return bad("Parent main class not found", 404);
    const mapCode = nextSuffix(parent.mapClasses.map((m: any) => m.mapCode), "", 4);
    return ok(await db.accMapClass.create({ data: {
      mapCode, mapName: name, prntCode: null,
      acCode: parent.acCode, mainCode: parent.mainCode, mainClassId: parent.id,
    }}), 201);
  }

  if (b.kind === "sub") {
    const parent = await db.accMapClass.findUnique({ where: { id: parentId }, include: { subClasses: true } });
    if (!parent) return bad("Parent map class not found", 404);
    // sub codes are mainCode + 4-digit serial, unique across the main code
    const siblings = await db.accSubClass.findMany({ where: { mainCode: parent.mainCode } });
    const subCode = (parent.mainCode || "") + nextSuffix(siblings.map((x: any) => x.subCode), parent.mainCode || "", 4);
    const sl = pad(parent.subClasses.length + 1, 3);
    return ok(await db.accSubClass.create({ data: {
      acCode: parent.acCode, mainCode: parent.mainCode, subCode, subName: name,
      sl, mapCode: parent.mapCode, mapClassId: parent.id,
    }}), 201);
  }

  return bad("Unknown kind");
}

// Rename a node
export async function PATCH(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const b = await parseBody(req);
  const name = b?.name?.trim();
  const id = Number(b?.id || 0);
  if (!name) return bad("Name is required");
  if (!id) return bad("Nothing selected");

  if (b.kind === "main") return ok(await db.accMainClass.update({ where: { id }, data: { mainName: name } }));
  if (b.kind === "map") return ok(await db.accMapClass.update({ where: { id }, data: { mapName: name } }));
  if (b.kind === "sub") return ok(await db.accSubClass.update({ where: { id }, data: { subName: name } }));
  return bad("Unknown kind");
}

// Delete a node (blocked while it still has children)
export async function DELETE(req: Request) {
  if (!await requireSession()) return bad("Unauthorized", 401);
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  const id = Number(sp.get("id") || 0);
  if (!id) return bad("Nothing selected");

  if (kind === "main") {
    if (await db.accMapClass.count({ where: { mainClassId: id } }) > 0)
      return bad("Cannot delete: this main class has map classes under it.");
    await db.accMainClass.delete({ where: { id } });
    return ok({ deleted: true });
  }
  if (kind === "map") {
    if (await db.accSubClass.count({ where: { mapClassId: id } }) > 0)
      return bad("Cannot delete: this map class has sub classes under it.");
    await db.accMapClass.delete({ where: { id } });
    return ok({ deleted: true });
  }
  if (kind === "sub") {
    await db.accSubClass.delete({ where: { id } });
    return ok({ deleted: true });
  }
  return bad("Unknown kind");
}
