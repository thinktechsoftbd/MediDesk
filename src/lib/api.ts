import { NextResponse } from "next/server";
import { getSession } from "./auth";

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) return null;
  return session;
}

export function ok(data: unknown, status = 200) { return NextResponse.json(data, { status }); }
export function bad(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function parseBody(req: Request) {
  try { return await req.json(); } catch { return null; }
}
