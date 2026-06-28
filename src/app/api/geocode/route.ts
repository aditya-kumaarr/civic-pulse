import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?q=<place>
 * Free forward-geocoding via OpenStreetMap Nominatim (no key). Done server-side
 * so we can set a proper User-Agent and avoid browser CORS/rate issues.
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "CivicPulse/1.0 (civic issue reporter demo)" } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    const r = data[0];
    return NextResponse.json({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: String(r.display_name).split(",").slice(0, 3).join(",").trim(),
    });
  } catch (e) {
    console.error("[geocode]", e);
    return NextResponse.json({ error: "Geocode failed" }, { status: 500 });
  }
}
