import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/report
 * Final report submission after AI categorisation + user review.
 * body: { title, description, category_id, severity, lat, lng,
 *         location_name, ward, image_url, user }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const required = ["title", "category_id", "lat", "lng"];
  for (const f of required) {
    if (body?.[f] === undefined || body?.[f] === null || body?.[f] === "") {
      return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
    }
  }
  const user = body?.user || { id: "u_demo", name: "You (Demo)" };

  // Duplicate detection: same category within ~120m
  const nearby = await store.nearbyIssues(
    Number(body.lat),
    Number(body.lng),
    120,
    body.category_id
  );
  const duplicate_of = nearby.length ? nearby[0] : null;

  const issue = await store.createIssue({
    title: String(body.title).slice(0, 140),
    description: String(body.description || "").slice(0, 1000),
    category_id: body.category_id,
    severity: Number(body.severity) || 3,
    lat: Number(body.lat),
    lng: Number(body.lng),
    location_name: String(body.location_name || "Unknown location"),
    ward: String(body.ward || "Ward 112"),
    image_url: String(body.image_url || "/img/pothole.jpg"),
    reporter_id: user.id,
    reporter_name: user.name,
  });

  return NextResponse.json({ issue, duplicate_of });
}
