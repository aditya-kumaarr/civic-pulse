"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  RefreshCw,
  LocateFixed,
} from "lucide-react";
import type { AICategorization, Issue } from "@/lib/types";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { severityLabel, severityColor, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

type Step = "photo" | "analyzing" | "review" | "done";

const SAMPLE_PHOTOS = [
  {
    url: "/img/pothole.jpg",
    caption: "Big pothole near the bus stop, getting worse",
    label: "Pothole",
  },
  {
    url: "/img/electric.jpg",
    caption: "Exposed wire from broken junction box, very dangerous",
    label: "Live wire",
  },
  {
    url: "/img/garbage.jpg",
    caption: "Garbage overflowing near the market",
    label: "Garbage",
  },
  {
    url: "/img/tree.jpg",
    caption: "Fallen tree branch blocking the lane",
    label: "Fallen tree",
  },
];

export function ReportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photo");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [ai, setAi] = useState<AICategorization | null>(null);
  const [aiSource, setAiSource] = useState<"mistral" | "openai" | "mock" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  // review fields (pre-filled by AI, user can edit)
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number; label: string } | null>(
    null
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // result
  const [result, setResult] = useState<{
    issue: Issue;
    duplicate_of: (Issue & { distance_m?: number }) | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Geolocation: grab once on mount, fall back to demo center ---
  useEffect(() => {
    grabLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grabLocation() {
    setGeoLoading(true);
    const fallback = { lat: 12.9719, lng: 77.6412, label: "Indiranagar, Bengaluru" };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo(fallback);
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: +pos.coords.latitude.toFixed(5),
          lng: +pos.coords.longitude.toFixed(5),
          label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
        });
        setGeoLoading(false);
      },
      () => {
        setGeo(fallback);
        setGeoLoading(false);
      },
      { timeout: 6000 }
    );
  }

  // --- Photo handling ---
  async function onFile(file: File) {
    setUploading(true);
    setAiError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
    } catch {
      // fall back to a sample image so flow continues
      setImageUrl(SAMPLE_PHOTOS[0].url);
    } finally {
      setUploading(false);
    }
  }

  function useSample(s: (typeof SAMPLE_PHOTOS)[number]) {
    setImageUrl(s.url);
    setCaption(s.caption);
  }

  // --- AI categorisation (the hero moment) ---
  async function runAI() {
    setStep("analyzing");
    setAiError("");
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, caption, fileName: "report.jpg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI failed");
      setAi(data.result);
      setAiSource(data.source);
      // pre-fill review fields
      setTitle(data.result.suggested_title || data.result.category_label);
      setCategoryId(data.result.category_id);
      setSeverity(data.result.severity);
      setDescription(
        caption ? caption : data.result.summary
      );
      // small beat so the user sees the "analysis" animation
      setTimeout(() => setStep("review"), 400);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong");
      setStep("photo");
    }
  }

  // --- Submit report ---
  async function submit() {
    if (!categoryId || !geo) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category_id: categoryId,
          severity,
          lat: geo.lat,
          lng: geo.lng,
          location_name: geo.label,
          ward: "Ward 112",
          image_url: imageUrl,
          user: { id: "u_demo", name: "You (Demo)" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setResult(data);
      setStep("done");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep("photo");
    setImageUrl("");
    setCaption("");
    setAi(null);
    setAiSource(null);
    setResult(null);
    setAiError("");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <StepIndicator step={step} />

      {step === "photo" && (
        <div className="cp-fade mt-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              Report an issue
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Snap or upload a photo. Our AI will instantly categorise it and
              estimate severity.
            </p>
          </div>

          {/* preview / dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            style={{ borderColor: "var(--divider)", background: "var(--bg-subtle)" }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="report" className="h-full w-full object-cover" />
            ) : uploading ? (
              <div className="flex flex-col items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                <div
                  className="grid h-14 w-14 place-items-center rounded-full shadow-sm"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <Camera className="h-7 w-7" style={{ color: "var(--accent)" }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Add a photo of the issue
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>JPG, PNG · max 8MB</span>
              </div>
            )}
          </div>

          {/* Camera vs Gallery */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text)" }}
            >
              <Camera className="h-4 w-4" style={{ color: "var(--accent)" }} /> Take photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text)" }}
            >
              <ImageIcon className="h-4 w-4" style={{ color: "var(--accent)" }} /> Gallery
            </button>
          </div>

          {/* Camera capture opens the rear camera on mobile; gallery omits capture. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />

          {/* caption */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Add a note <span style={{ color: "var(--text-tertiary)" }}>(optional, helps the AI)</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="e.g. Deep pothole near the bus stop, dangerous at night"
              className="cp-input resize-none"
            />
          </div>

          {/* samples */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              No photo handy? Try a sample
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLE_PHOTOS.map((s) => (
                <button
                  key={s.url}
                  onClick={() => useSample(s)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-xl border-2 transition",
                    imageUrl === s.url
                      ? "border-[var(--accent)]"
                      : "border-transparent hover:border-[var(--divider)]"
                  )}
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt={s.label}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[10px] font-medium text-white">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {aiError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4" /> {aiError}
            </div>
          )}

          {/* location */}
          <div
            className="flex items-center gap-2 rounded-xl p-3 text-sm"
            style={{ background: "var(--bg-subtle)" }}
          >
            <MapPin className="h-4 w-4" style={{ color: "var(--accent)" }} />
            {geoLoading ? (
              <span style={{ color: "var(--text-tertiary)" }}>Detecting your location…</span>
            ) : geo ? (
              <span style={{ color: "var(--text-secondary)" }}>📍 {geo.label}</span>
            ) : (
              <span style={{ color: "var(--text-tertiary)" }}>Location unavailable</span>
            )}
            <button
              onClick={grabLocation}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              <LocateFixed className="h-3.5 w-3.5" /> Update
            </button>
          </div>

          <button
            disabled={!imageUrl || uploading || !geo}
            onClick={runAI}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            <Sparkles className="h-4 w-4" />
            Analyse with AI
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <Analyzing imageUrl={imageUrl} />
      )}

      {step === "review" && ai && (
        <div className="cp-fade mt-6 space-y-5">
          {/* AI result card */}
          <div
            className="overflow-hidden rounded-xl border shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ background: "var(--accent-soft)" }}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                <Sparkles className="h-3.5 w-3.5" /> AI Analysis
              </div>
              {aiSource && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.7)", color: "var(--text-secondary)" }}
                >
                  {aiSource === "mistral"
                    ? "Mistral Vision"
                    : aiSource === "openai"
                    ? "GPT-4o Vision"
                    : "Smart classifier"}
                </span>
              )}
            </div>
            <div className="flex gap-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="report"
                className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-xl">{getCategory(ai.category_id).icon}</span>
                  <span className="min-w-0 truncate font-semibold" style={{ color: "var(--text)" }}>{ai.category_label}</span>
                  <div className="shrink-0">
                    <Badge className={severityColor(ai.severity)}>
                      {severityLabel(ai.severity)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{ai.summary}</p>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  <span>{ai.department}</span>
                  <span>·</span>
                  <span>{Math.round(ai.confidence * 100)}% confidence</span>
                </div>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-subtle)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(ai.confidence * 100)}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          </div>

          {/* editable fields */}
          <div className="space-y-3">
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="cp-input"
              />
            </Field>

            <Field label="Category">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className="rounded-full border px-2.5 py-1.5 text-xs font-medium transition"
                    style={
                      categoryId === c.id
                        ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" }
                        : { borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }
                    }
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`Severity — ${severityLabel(severity)}`}>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)]"
                />
                <Badge className={severityColor(severity)}>
                  {severity}/5
                </Badge>
              </div>
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="cp-input resize-none"
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("photo")}
              className="inline-flex items-center gap-1 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              disabled={submitting || !title}
              onClick={submit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="cp-fade mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold" style={{ color: "var(--text)" }}>
            Report submitted!
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Your report is live on the map and the community can now verify it.
          </p>

          {result.duplicate_of && (
            <div className="mx-auto mt-5 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Possible duplicate detected
              </div>
              <p className="mt-1 text-xs text-amber-700">
                AI found a similar open report{" "}
                {result.duplicate_of?.distance_m
                  ? `~${Math.round(result.duplicate_of.distance_m)}m`
                  : "nearby"}{" "}
                away. Consider verifying it instead.
              </p>
              <button
                onClick={() => router.push(`/issues/${result.duplicate_of!.id}`)}
                className="mt-2 text-xs font-semibold text-amber-800 underline"
              >
                View existing report →
              </button>
            </div>
          )}

          <div
            className="mx-auto mt-6 max-w-md rounded-xl border p-4 text-left shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.issue.image_url}
              alt=""
              className="mb-3 h-32 w-full rounded-xl object-cover"
            />
            <div className="font-semibold" style={{ color: "var(--text)" }}>{result.issue.title}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              📍 {result.issue.location_name}
            </div>
            <div className="mt-1 text-xs text-emerald-600">
              +10 civic points earned
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)]"
              style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              <RefreshCw className="h-4 w-4" /> Report another
            </button>
            <button
              onClick={() => router.push(`/issues/${result.issue.id}`)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
              style={{ background: "var(--accent)" }}
            >
              View report <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* shared input style */}
      <style>{`
        .cp-input{width:100%;border:1px solid var(--divider);background:var(--bg-elevated);color:var(--text);border-radius:0.75rem;padding:0.6rem 0.75rem;font-size:0.875rem;outline:none}
        .cp-input::placeholder{color:var(--text-tertiary)}
        .cp-input:focus{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 20%,transparent)}
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ["photo", "analyzing", "review", "done"];
  const idx = order.indexOf(step);
  const labels = ["Photo", "AI", "Review", "Done"];
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((l, i) => (
        <div key={l} className="flex min-w-0 flex-1 items-center gap-1.5">
          <div
            className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white transition"
            style={{
              background:
                i < idx ? "#22c55e" : i === idx ? "var(--accent)" : "var(--bg-subtle)",
              color: i <= idx ? "#fff" : "var(--text-tertiary)",
            }}
          >
            {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className="hidden text-xs font-medium sm:inline"
            style={{ color: i <= idx ? "var(--text-secondary)" : "var(--text-tertiary)" }}
          >
            {l}
          </span>
          {i < labels.length - 1 && (
            <div className="mx-1 h-0.5 flex-1 rounded" style={{ background: "var(--bg-subtle)" }}>
              <div
                className={cn(
                  "h-full rounded transition-all",
                  i < idx ? "w-full" : "w-0"
                )}
                style={{ background: "var(--accent)" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Analyzing({ imageUrl }: { imageUrl: string }) {
  const steps = [
    "Loading image…",
    "Detecting objects & context…",
    "Matching to category…",
    "Estimating severity…",
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 550);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="cp-fade mt-8 flex flex-col items-center text-center">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="analyzing"
          className="h-44 w-44 rounded-2xl object-cover"
        />
        <div className="absolute inset-0 rounded-2xl ring-4 ring-[var(--accent)]/30" />
        {/* scanning line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-pulse rounded-2xl bg-[var(--accent)]/60" />
      </div>
      <div className="mt-5 flex items-center gap-2" style={{ color: "var(--accent)" }}>
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wide">AI analysing</span>
      </div>
      <div className="mt-4 w-full max-w-xs space-y-2 text-left">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-sm">
            <div className="grid h-4 w-4 place-items-center">
              {i < active ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : i === active ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--accent)" }} />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--bg-subtle)" }} />
              )}
            </div>
            <span style={{ color: i <= active ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
