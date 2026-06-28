"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { IssueCard } from "@/components/IssueCard";
import type { Issue } from "@/lib/types";
import { Plus, Search, LocateFixed, Loader2, X } from "lucide-react";

const IssueMap = dynamic(
  () => import("@/components/IssueMap").then((m) => m.IssueMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="grid h-full w-full place-items-center text-sm"
        style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}
      >
        Loading map…
      </div>
    ),
  }
);

const DEFAULT_CENTER: [number, number] = [12.9719, 77.6412];

// Reports only exist within this radius of a covered area; elsewhere is empty.
const NEARBY_RADIUS_M = 40_000; // ~40 km, a metro area

// The two demo areas that actually have seeded reports.
const SAMPLE_PLACES: { label: string; lat: number; lng: number; hint?: string }[] = [
  { label: "Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412, hint: "demo area" },
  { label: "Cyber City, Gurugram", lat: 28.4949, lng: 77.0869, hint: "demo area" },
];

type GeoStatus = "idle" | "locating" | "granted" | "denied";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function MapView({
  issues,
  total,
  resolved,
}: {
  issues: Issue[];
  total: number;
  resolved: number;
}) {
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");

  function useGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLabel("Your current location");
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  function setPlace(lat: number, lng: number, label: string) {
    setUserLoc({ lat, lng });
    setLocLabel(label);
    setGeoStatus("granted");
  }

  async function searchPlace(query: string): Promise<string | null> {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) return "Location not found";
    const d = await res.json();
    setPlace(d.lat, d.lng, d.label);
    return null;
  }

  function clearLocation() {
    setUserLoc(null);
    setLocLabel(null);
    setGeoStatus("idle");
  }

  // Ask for the user's location as soon as the map opens.
  useEffect(() => {
    useGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When located, only show reports within the metro radius — elsewhere is empty.
  const inArea = useMemo(
    () =>
      userLoc
        ? issues.filter((i) => haversineMeters(userLoc, i) <= NEARBY_RADIUS_M)
        : issues,
    [issues, userLoc]
  );

  const filtered = inArea.filter((i) => {
    if (!q.trim()) return true;
    const hay = `${i.title} ${i.location_name} ${i.ward}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  // Attach distance + sort by nearest once we know where the user is.
  const ranked = useMemo(() => {
    if (!userLoc) {
      return filtered.map((i) => ({ issue: i, distance_m: null as number | null }));
    }
    return filtered
      .map((i) => ({ issue: i, distance_m: haversineMeters(userLoc, i) }))
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
  }, [filtered, userLoc]);

  // Banner reflects the located area when known, else the platform totals.
  const areaTotal = userLoc ? inArea.length : total;
  const areaResolved = userLoc
    ? inArea.filter((i) => i.status === "resolved").length
    : resolved;
  const emptyArea = !!userLoc && inArea.length === 0;

  const active = activeId ? issues.find((i) => i.id === activeId) : null;
  const flyTo: [number, number] | undefined = active
    ? [active.lat, active.lng]
    : userLoc
    ? [userLoc.lat, userLoc.lng]
    : undefined;

  return (
    <div
      className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_380px]"
      style={{ background: "var(--bg-canvas)" }}
    >
      {/* Map */}
      <div
        className="relative h-[60vh] overflow-hidden rounded-xl border shadow-card lg:h-[calc(100vh-7rem)]"
        style={{ borderColor: "var(--divider)" }}
      >
        <IssueMap
          issues={filtered}
          center={DEFAULT_CENTER}
          flyTo={flyTo}
          userLoc={userLoc}
          onSelectId={(id) => setActiveId(id)}
        />

        {/* Report button — top right (the zoom control owns top-left) */}
        <Link
          href="/report"
          className="pointer-events-auto absolute right-4 top-4 z-[500] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="h-3.5 w-3.5" /> Report
        </Link>

        {/* Stat pill — bottom left, clear of the zoom control */}
        <div
          className="pointer-events-auto absolute bottom-4 left-4 z-[500] rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-md backdrop-blur"
          style={{ background: "rgba(255,255,255,0.95)", color: "var(--text-secondary)" }}
        >
          <span style={{ color: "var(--accent)" }}>{filtered.length}</span>{" "}
          {userLoc ? "reports near you" : "active reports"}
        </div>
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-3 lg:h-[calc(100vh-7rem)] lg:overflow-hidden">
        {/* Community impact banner */}
        <div
          className="flex items-center gap-3 rounded-xl p-4 text-white shadow-card"
          style={{ background: "var(--accent)" }}
        >
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
              {userLoc ? "In your area" : "Community impact"}
            </div>
            <div className="mt-0.5 text-2xl font-bold">
              {areaTotal} reports · {areaResolved} resolved
            </div>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-xs font-semibold transition"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            Dashboard →
          </Link>
        </div>

        {/* Location picker */}
        <LocationPicker
          userLoc={userLoc}
          locLabel={locLabel}
          geoStatus={geoStatus}
          onUseGps={useGps}
          onSearch={searchPlace}
          onSample={setPlace}
          onClear={clearLocation}
        />

        {/* Search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reports, area, ward…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--divider)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* List header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {userLoc ? "Nearest reports" : "Recent reports"}
          </h2>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} shown
          </span>
        </div>

        {/* Issue cards — flex-fill the panel and scroll cleanly inside it */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-4 lg:pr-1">
          {ranked.map(({ issue, distance_m }) => (
            <div
              key={issue.id}
              onClick={() => setActiveId(issue.id)}
              className="rounded-xl transition"
              style={
                activeId === issue.id
                  ? { outline: `2px solid var(--accent)`, outlineOffset: 2 }
                  : undefined
              }
            >
              <IssueCard issue={issue} distanceM={distance_m} />
            </div>
          ))}
          {filtered.length === 0 &&
            (emptyArea ? (
              <div
                className="rounded-xl border border-dashed p-8 text-center"
                style={{ borderColor: "var(--divider)" }}
              >
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  No reports in your area yet
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  CivicPulse is just getting started here. Be the first to put your
                  neighbourhood on the map.
                </p>
                <Link
                  href="/report"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-95"
                  style={{ background: "var(--accent)" }}
                >
                  <Plus className="h-3.5 w-3.5" /> Report the first issue
                </Link>
              </div>
            ) : (
              <div
                className="rounded-xl border border-dashed p-8 text-center text-sm"
                style={{ borderColor: "var(--divider)", color: "var(--text-tertiary)" }}
              >
                No reports match your search.
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function LocationPicker({
  userLoc,
  locLabel,
  geoStatus,
  onUseGps,
  onSearch,
  onSample,
  onClear,
}: {
  userLoc: { lat: number; lng: number } | null;
  locLabel: string | null;
  geoStatus: GeoStatus;
  onUseGps: () => void;
  onSearch: (q: string) => Promise<string | null>;
  onSample: (lat: number, lng: number, label: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const error = await onSearch(q.trim());
      if (error) setErr(error);
      else setQ("");
    } catch {
      setErr("Couldn't look that up");
    } finally {
      setBusy(false);
    }
  }

  // Located → compact summary with a way to change it.
  if (userLoc) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <LocateFixed className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{locLabel ?? "Your location"}</span>
        <button
          onClick={onClear}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-2 font-semibold transition hover:bg-[rgba(74,54,179,0.12)]"
        >
          <X className="h-3 w-3" /> Change
        </button>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-xl border p-2.5"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
    >
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Enter a location…"
          className="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-sm outline-none"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)", color: "var(--text)" }}
        />
        <button
          onClick={submit}
          disabled={busy}
          className="grid place-items-center rounded-lg px-3 text-white transition hover:brightness-95 disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onUseGps}
          className="inline-flex min-h-[40px] items-center gap-1.5 py-2 text-xs font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {geoStatus === "locating" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {geoStatus === "denied" ? "Location off — retry" : "Use my location"}
        </button>
        {err && (
          <span className="text-[11px]" style={{ color: "#dc2626" }}>
            {err}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_PLACES.map((p) => (
          <button
            key={p.label}
            onClick={() => onSample(p.lat, p.lng, p.label)}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-2 text-[11px] font-medium transition hover:bg-[var(--bg-subtle)]"
            style={{ borderColor: "var(--divider)", color: "var(--text-secondary)" }}
          >
            {p.label.split(",")[0]}
            {p.hint && (
              <span style={{ color: "var(--accent)" }}>· {p.hint}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
