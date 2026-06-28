import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/stats — dashboard aggregates */
export async function GET() {
  const stats = await store.stats();
  return NextResponse.json({ stats });
}
