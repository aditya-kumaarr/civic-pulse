import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST /api/issues/:id/comments  { text, user } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const user = body?.user || { id: "u_demo", name: "You (Demo)" };
  const comment = await store.addComment(id, user, text.slice(0, 500));
  return NextResponse.json({ comment });
}
