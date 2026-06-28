import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST /api/issues/:id/verify  { type: "confirm"|"deny", user } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const type = body?.type === "deny" ? "deny" : "confirm";
  const user = body?.user || { id: "u_demo", name: "You (Demo)" };
  const issue = await store.verify(id, user, type);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}
