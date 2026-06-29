"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IssueCard } from "@/components/IssueCard";
import { CATEGORIES } from "@/lib/categories";
import type { Issue, IssueStatus } from "@/lib/types";
import { Plus, Search } from "lucide-react";

const STATUS_TABS: { id: IssueStatus | "all"; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "reported",    label: "Reported" },
  { id: "verified",    label: "Verified" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved",    label: "Resolved" },
];

// Cities/areas that have reports. `id` matches the issue `ward` field.
const CITIES = [
  { id: "Indiranagar", label: "Indiranagar, Bengaluru", lat: 12.9719, lng: 77.6412 },
  { id: "Gurugram", label: "Cyber City, Gurugram", lat: 28.4949, lng: 77.0869 },
];

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 *
      Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function IssuesList({ issues }: { issues: Issue[] }) {
  const [tab, setTab] = useState<IssueStatus | "all">("all");
  const [cat, setCat] = useState<string>("all");
  const [city, setCity] = useState<string>(CITIES[0].id);
  const [q, setQ] = useState("");

  // Default the city to whichever covered area is nearest to the user.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let best = CITIES[0];
        let bestD = Infinity;
        for (const c of CITIES) {
          const d = distanceKm(pos.coords.latitude, pos.coords.longitude, c.lat, c.lng);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        setCity(best.id);
      },
      () => {},
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const cityLabel = CITIES.find((c) => c.id === city)?.label ?? city;
  const cityTotal = issues.filter((i) => i.ward === city).length;

  const filtered = issues.filter((i) => {
    if (i.ward !== city) return false;
    if (tab !== "all" && i.status !== tab) return false;
    if (cat !== "all" && i.category_id !== cat) return false;
    if (q.trim()) {
      const hay = `${i.title} ${i.location_name}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Issues near you
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {cityTotal} {cityTotal === 1 ? "report" : "reports"} in {cityLabel}
      </p>

      {/* Status tabs */}
      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition"
              style={
                active
                  ? { background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(74,54,179,0.3)" }
                  : { background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--divider)" }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--divider)",
              color: "var(--text)",
            }}
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--divider)",
            color: "var(--text)",
          }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--divider)",
            color: "var(--text)",
          }}
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {filtered.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
        {filtered.length === 0 &&
          (cityTotal === 0 ? (
            <div
              className="rounded-xl border border-dashed p-10 text-center"
              style={{ borderColor: "var(--divider)" }}
            >
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                No issues in {cityLabel} yet
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                Be the first to put your neighbourhood on the map.
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
              className="rounded-xl border border-dashed p-10 text-center text-sm"
              style={{ borderColor: "var(--divider)", color: "var(--text-tertiary)" }}
            >
              No issues match these filters in {cityLabel}.
            </div>
          ))}
      </div>
    </div>
  );
}
