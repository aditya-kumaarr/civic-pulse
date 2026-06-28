import { promises as fs } from "fs";
import path from "path";
import type { AICategorization } from "./types";
import { CATEGORIES, getCategory } from "./categories";

/**
 * AI categorisation layer.
 *
 * One function, three implementations behind it:
 *  - If MISTRAL_API_KEY is present, call Mistral Pixtral vision.
 *  - Else if OPENAI_API_KEY is present, call OpenAI GPT-4o vision.
 *  - Otherwise, run a deterministic heuristic mock so the demo always works.
 *
 * All three return the same AICategorization shape the UI consumes.
 */

export interface CategorizeInput {
  /** data URL, remote URL, or local /uploads path of the report image */
  imageUrl?: string;
  /** optional user caption / voice transcript */
  caption?: string;
  /** optional file name hints */
  fileName?: string;
}

export type AiSource = "mistral" | "openai" | "mock";

interface ProviderConfig {
  id: "mistral" | "openai";
  apiKey: string;
  endpoint: string;
  model: string;
  /** Mistral expects image_url as a bare string; OpenAI expects { url }. */
  imageAsString: boolean;
  label: string;
}

/** Pick the active provider from env, preferring Mistral. */
function activeProvider(): ProviderConfig | null {
  if (process.env.MISTRAL_API_KEY) {
    return {
      id: "mistral",
      apiKey: process.env.MISTRAL_API_KEY,
      endpoint: "https://api.mistral.ai/v1/chat/completions",
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      imageAsString: true,
      label: "Mistral Vision",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4o",
      imageAsString: false,
      label: "GPT-4o Vision",
    };
  }
  return null;
}

export function isAiEnabled(): boolean {
  return !!activeProvider();
}

/** Build the catalog list for the LLM prompt. */
function catalogText(): string {
  return CATEGORIES.map(
    (c) => `- "${c.id}" => ${c.label} (dept: ${c.department})`
  ).join("\n");
}

/**
 * Resolve an image reference into something a remote vision API can actually
 * read. Remote/data URLs pass through; a local /uploads path is read off disk
 * and inlined as a base64 data URI (the model server can't reach localhost).
 */
async function resolveImageForLLM(imageUrl?: string): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (imageUrl.startsWith("data:")) return imageUrl;
  try {
    const rel = imageUrl.replace(/^\/+/, "");
    const filePath = path.join(process.cwd(), "public", rel);
    const buf = await fs.readFile(filePath);
    const ext = (rel.split(".").pop() || "jpg").toLowerCase();
    const mime =
      ext === "png" ? "image/png"
      : ext === "webp" ? "image/webp"
      : ext === "gif" ? "image/gif"
      : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    // unreadable — proceed caption-only rather than failing the whole call
    return undefined;
  }
}

type ImagePart =
  | { type: "image_url"; image_url: string }
  | { type: "image_url"; image_url: { url: string } };
type TextPart = { type: "text"; text: string };

/**
 * Call an OpenAI-compatible chat-completions vision endpoint (Mistral Pixtral
 * or OpenAI GPT-4o). Throws on error so the caller can fall back to the mock.
 */
async function categorizeWithLLM(
  input: CategorizeInput,
  cfg: ProviderConfig
): Promise<AICategorization> {
  const system = [
    "You are CivicPulse, an AI that categorises photos of neighbourhood problems.",
    "Look at the image and return JSON ONLY with these fields:",
    "{ category_id, severity (1-5 integer), summary (one sentence), suggested_title (short), confidence (0-1) }",
    "Pick category_id from this list:\n" + catalogText(),
    "Severity guide: 5 = immediate danger (live wire, road collapse, flooding into homes), 4 = serious/urgent, 3 = noticeable, 2 = minor, 1 = cosmetic.",
    "Respond with raw JSON, no markdown.",
  ].join("\n");

  const userContent: Array<TextPart | ImagePart> = [];
  userContent.push({
    type: "text",
    text:
      input.caption?.trim() || input.fileName
        ? `User note: ${input.caption || input.fileName}`
        : "Categorise this report.",
  });

  const resolvedImage = await resolveImageForLLM(input.imageUrl);
  if (resolvedImage) {
    userContent.push(
      cfg.imageAsString
        ? { type: "image_url", image_url: resolvedImage }
        : { type: "image_url", image_url: { url: resolvedImage } }
    );
  }

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      max_tokens: 300,
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`${cfg.id} error ${res.status}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJson(typeof raw === "string" ? raw : JSON.stringify(raw));
  if (!parsed) throw new Error(`Could not parse ${cfg.id} JSON`);

  const parsedId = typeof parsed.category_id === "string" ? parsed.category_id : "";
  const catId = CATEGORIES.some((c) => c.id === parsedId) ? parsedId : "other";
  const cat = getCategory(catId);
  return {
    category_id: catId,
    category_label: cat.label,
    severity: clampSev(parsed.severity),
    department: cat.department,
    summary: String(parsed.summary || `${cat.label} detected in the image.`),
    confidence: clamp01(parsed.confidence ?? 0.7),
    suggested_title: String(parsed.suggested_title || cat.label),
  };
}

function clampSev(n: unknown): number {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return 3;
  return Math.max(1, Math.min(5, v));
}
function clamp01(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return 0.7;
  return Math.max(0, Math.min(1, v));
}

function safeParseJson(s: string): Record<string, unknown> | null {
  try {
    // strip markdown fences if present, then grab the first {...} block
    const cleaned = s.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : cleaned);
  } catch {
    return null;
  }
}

// ---------------- Mock categoriser ----------------

const KEYWORDS: { id: string; words: string[]; baseSeverity: number }[] = [
  { id: "pothole", words: ["pothole", "road", "crater", "speedbreaker", "asphalt"], baseSeverity: 4 },
  { id: "streetlight", words: ["streetlight", "street light", "lamp", "dark", "light"], baseSeverity: 3 },
  { id: "water_leak", words: ["water", "leak", "pipe", "tap", "burst"], baseSeverity: 4 },
  { id: "garbage", words: ["garbage", "trash", "waste", "bin", "rubbish", "dump"], baseSeverity: 3 },
  { id: "drainage", words: ["drain", "flood", "overflow", "sewage", "waterlog"], baseSeverity: 4 },
  { id: "tree", words: ["tree", "branch", "leaves", "uprooted", "fallen"], baseSeverity: 3 },
  { id: "graffiti", words: ["graffiti", "vandal", "paint", "spray"], baseSeverity: 2 },
  { id: "signage", words: ["sign", "signal", "board", "stop", "hoarding"], baseSeverity: 2 },
  { id: "electric", words: ["wire", "electric", "spark", "junction box", "shock", "live"], baseSeverity: 5 },
];

/**
 * Deterministic mock. Uses caption text + filename + a tiny hash of the image
 * URL so the same image yields stable, believable output for demos.
 */
function mockCategorize(input: CategorizeInput): AICategorization {
  const haystack = `${input.caption || ""} ${input.fileName || ""}`.toLowerCase();
  let best = { id: "other", score: 0, baseSeverity: 2 };
  for (const k of KEYWORDS) {
    let score = 0;
    for (const w of k.words) if (haystack.includes(w)) score += 2;
    if (score > best.score) best = { id: k.id, score, baseSeverity: k.baseSeverity };
  }

  // small deterministic jitter from image url so not every "other" looks identical
  const url = input.imageUrl || input.fileName || "x";
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) & 0xffff;
  const jitter = (hash % 5) - 2; // -2..+2

  const cat = getCategory(best.id);
  const severity = clampSev(best.baseSeverity + jitter);
  const confidence =
    best.id === "other" ? 0.55 + (hash % 20) / 100 : Math.min(0.96, 0.78 + (best.score - 2) * 0.06);

  const summaries: Record<string, string> = {
    pothole: "A road surface defect visible in the image — likely a pothole or damaged asphalt.",
    streetlight: "An outdoor light fixture that appears faulty or non-functional.",
    water_leak: "Standing water or a leak from a pipe fitting visible on the ground.",
    garbage: "Accumulated waste or an overflowing bin in a public area.",
    drainage: "Water pooling near a drain, suggesting a blockage or overflow.",
    tree: "A fallen tree or large branch obstructing a path or road.",
    graffiti: "Unauthorised paint or markings visible on a wall or surface.",
    signage: "A damaged, bent or unreadable road sign.",
    electric: "Exposed electrical wiring or a damaged junction box — potential hazard.",
    other: "A neighbourhood issue is visible but the category is uncertain.",
  };

  return {
    category_id: cat.id,
    category_label: cat.label,
    severity,
    department: cat.department,
    summary: summaries[cat.id] || summaries.other,
    confidence: Math.round(confidence * 100) / 100,
    suggested_title: `${cat.label} reported via photo`,
  };
}

/** Public entry point used by the API route. */
export async function categorizeIssue(
  input: CategorizeInput
): Promise<{ result: AICategorization; source: AiSource }> {
  const cfg = activeProvider();
  if (cfg) {
    try {
      const result = await categorizeWithLLM(input, cfg);
      return { result, source: cfg.id };
    } catch (e) {
      console.warn(`[ai] ${cfg.id} call failed, falling back to mock:`, e);
    }
  }
  // simulate a little latency for realistic UX
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
  return { result: mockCategorize(input), source: "mock" };
}
