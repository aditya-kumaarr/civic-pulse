import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const BUCKET = "report-images";
const ALLOWED = ["jpg", "jpeg", "png", "webp", "gif"];

/**
 * POST /api/upload  (multipart/form-data, field "file")
 *
 * - Supabase configured → upload to the public `report-images` bucket and
 *   return its public URL (works across all devices + readable by the vision
 *   model). Falls back to local on any storage error.
 * - Otherwise → save to /public/uploads and return that URL (single-machine).
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 8MB" }, { status: 413 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 4);
    const finalExt = ALLOWED.includes(ext) ? ext : "jpg";
    const name = `report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${finalExt}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || `image/${finalExt === "jpg" ? "jpeg" : finalExt}`;

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { error } = await sb.storage
          .from(BUCKET)
          .upload(name, buf, { contentType, upsert: false });
        if (error) throw error;
        const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
        return NextResponse.json({ url: data.publicUrl });
      } catch (e) {
        console.error("[upload] supabase storage failed, using local", e);
        // fall through to local
      }
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
