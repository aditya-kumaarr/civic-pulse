import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/users — leaderboard */
export async function GET() {
  const users = await store.listUsers();
  return NextResponse.json({ users });
}
