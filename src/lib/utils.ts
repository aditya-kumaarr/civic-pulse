import { clsx, type ClassValue } from "clsx";
import type { IssueStatus, Issue } from "./types";
import { getCategory } from "./categories";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function timeAgo(iso: string): string {
  const then = +new Date(iso);
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  // Deterministic, locale/timezone-independent (avoids SSR hydration mismatch).
  const dt = new Date(iso);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export function formatDate(iso: string): string {
  const dt = new Date(iso);
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${hh}:${mm}`;
}

export const STATUS_META: Record<
  IssueStatus,
  { label: string; badge: string; dot: string }
> = {
  reported: {
    label: "Reported",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  verified: {
    label: "Verified",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

export function severityLabel(s: number): string {
  return ["", "Cosmetic", "Minor", "Noticeable", "Serious", "Critical"][s] || "Minor";
}

export function severityColor(s: number): string {
  if (s >= 5) return "text-rose-600 bg-rose-50 border-rose-200";
  if (s === 4) return "text-orange-600 bg-orange-50 border-orange-200";
  if (s === 3) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-50 border-slate-200";
}

export type SlaState = "ok" | "soon" | "overdue" | "resolved" | "none";

function fmtDur(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m`;
}

/**
 * Live SLA status for an issue, derived from its category's target days.
 * Open issues count down to the deadline (and flip to "overdue" past it);
 * resolved issues report how long they took.
 */
export function slaStatus(issue: Issue): { state: SlaState; label: string } {
  if (issue.status === "rejected") return { state: "none", label: "" };
  if (issue.status === "resolved") {
    if (!issue.resolved_at) return { state: "resolved", label: "Resolved" };
    const took = +new Date(issue.resolved_at) - +new Date(issue.created_at);
    return { state: "resolved", label: `Resolved in ${fmtDur(took)}` };
  }
  const slaMs = getCategory(issue.category_id).sla_days * 86_400_000;
  const remaining = +new Date(issue.created_at) + slaMs - Date.now();
  if (remaining <= 0) return { state: "overdue", label: `${fmtDur(-remaining)} overdue` };
  if (remaining < 86_400_000) return { state: "soon", label: `${fmtDur(remaining)} left` };
  return { state: "ok", label: `${fmtDur(remaining)} left` };
}

/** color name from categories.ts -> tailwind bg classes for markers */
export function colorToBg(color: string): string {
  const map: Record<string, string> = {
    amber: "#f59e0b",
    yellow: "#eab308",
    blue: "#3b82f6",
    green: "#22c55e",
    cyan: "#06b6d4",
    emerald: "#10b981",
    fuchsia: "#d946ef",
    orange: "#f97316",
    red: "#ef4444",
    slate: "#64748b",
  };
  return map[color] || "#64748b";
}
