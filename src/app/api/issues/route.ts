import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { IssueStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/issues?status=&category_id=&ward= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") as IssueStatus) || undefined;
  const category_id = searchParams.get("category_id") || undefined;
  const ward = searchParams.get("ward") || undefined;
  const issues = await store.listIssues({ status, category_id, ward });
  return NextResponse.json({ issues });
}
