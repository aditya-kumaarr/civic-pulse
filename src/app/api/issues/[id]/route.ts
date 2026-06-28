import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const issue = await store.getIssue(id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [verifications, timeline, comments] = await Promise.all([
    store.listVerifications(id),
    store.listTimeline(id),
    store.listComments(id),
  ]);
  return NextResponse.json({ issue, verifications, timeline, comments });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  const byUser = body?.by_user || "Authority";
  if (!status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }
  const issue = await store.updateIssueStatus(id, status, byUser, body?.note);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}
