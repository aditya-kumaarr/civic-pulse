import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset
 * Restores the database to seed data. Use it to (a) seed a fresh Supabase
 * project and (b) reset demo data between runs.
 *
 * If ADMIN_TOKEN is set, the request must include ?token=<ADMIN_TOKEN>.
 */
export async function POST(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (token) {
    const provided = new URL(req.url).searchParams.get("token");
    if (provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    await store.resetToSeed();
    const issues = await store.listIssues();
    return NextResponse.json({ ok: true, seeded: issues.length });
  } catch (e) {
    console.error("[admin/reset]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reset failed" },
      { status: 500 }
    );
  }
}
