import { denyUnless } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { bad, ok, parseBody, requireSession } from "@/lib/api";
export async function GET(req:Request){{ const denied = await denyUnless("SECURITY.V"); if (denied) return denied; }const userId=Number(new URL(req.url).searchParams.get("userId"));return ok(await db.userMenu.findMany({where:{userId},include:{menu:true}}));}
export async function POST(req:Request){{ const denied = await denyUnless("SECURITY.M"); if (denied) return denied; }const b=await parseBody(req);return ok(await db.userMenu.upsert({where:{userId_menuId:{userId:Number(b.userId),menuId:Number(b.menuId)}},update:{canView:b.canView,canCreate:b.canCreate,canEdit:b.canEdit,canDelete:b.canDelete},create:{userId:Number(b.userId),menuId:Number(b.menuId),canView:b.canView??true,canCreate:b.canCreate??false,canEdit:b.canEdit??false,canDelete:b.canDelete??false}}),201);}
