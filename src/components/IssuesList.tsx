"use client";

import { useState } from "react";
import { IssueCard } from "@/components/IssueCard";
import { CATEGORIES } from "@/lib/categories";
import type { Issue, IssueStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const STATUS_TABS: { id: IssueStatus | "all"; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "reported",    label: "Reported" },
  { id: "verified",    label: "Verified" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved",    label: "Resolved" },
];

export function IssuesList({ issues, wards }: { issues: Issue[]; wards: string[] }) {
  const [tab, setTab]   = useState<IssueStatus | "all">("all");
  const [cat, setCat]   = useState<string>("all");
  const [ward, setWard] = useState<string>("all");
  const [q, setQ]       = useState("");

  const filtered = issues.filter((i) => {
    if (tab !== "all" && i.status !== tab) return false;
    if (cat !== "all" && i.category_id !== cat) return false;
    if (ward !== "all" && i.ward !== ward) return false;
    if (q.trim()) {
      const hay = `${i.title} ${i.location_name}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        All issues
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {issues.length} reports across {wards.length} wards
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
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--divider)",
            color: "var(--text)",
          }}
        >
          <option value="all">All wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {filtered.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
        {filtered.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-10 text-center text-sm"
            style={{ borderColor: "var(--divider)", color: "var(--text-tertiary)" }}
          >
            No issues match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
