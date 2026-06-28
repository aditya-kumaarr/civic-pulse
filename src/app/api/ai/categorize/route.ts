import { NextRequest, NextResponse } from "next/server";
import { categorizeIssue, isAiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/categorize
 * body: { imageUrl?, caption?, fileName? }
 * returns: { result: AICategorization, source: "openai"|"mock" }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body || (!body.imageUrl && !body.caption && !body.fileName)) {
    return NextResponse.json(
      { error: "Provide imageUrl, caption or fileName" },
      { status: 400 }
    );
  }
  const { result, source } = await categorizeIssue({
    imageUrl: body.imageUrl,
    caption: body.caption,
    fileName: body.fileName,
  });
  return NextResponse.json({ result, source, aiEnabled: isAiEnabled() });
}
