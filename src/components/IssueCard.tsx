import Link from "next/link";
import type { Issue } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { StatusBadge, SeverityBadge, SlaPill } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function IssueCard({
  issue,
  distanceM,
}: {
  issue: Issue;
  distanceM?: number | null;
}) {
  const cat = getCategory(issue.category_id);
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="group flex gap-3 rounded-xl border p-3 transition shadow-card hover:shadow-md"
      style={{
        background: "var(--bg-elevated)",
        borderColor: "var(--divider)",
      }}
    >
      <div
        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg"
        style={{ background: "var(--bg-subtle)" }}
      >
        {issue.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={issue.image_url}
            alt={issue.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl">
            {cat.icon}
          </div>
        )}
        <span className="absolute left-1 top-1 text-base drop-shadow">
          {cat.icon}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="min-w-0 line-clamp-1 text-[13px] font-semibold transition"
            style={{ color: "var(--text)" }}
          >
            {issue.title}
          </h3>
          <div className="shrink-0">
            <StatusBadge status={issue.status} />
          </div>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          📍 {issue.location_name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={issue.severity} />
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              borderColor: "var(--divider)",
            }}
          >
            {cat.department}
          </span>
          <SlaPill issue={issue} />
          {distanceM != null && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                borderColor: "var(--divider)",
              }}
            >
              📍 {fmtDistance(distanceM)}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="min-w-0 truncate">
            👤 {issue.reporter_name} · {timeAgo(issue.created_at)}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span>👍 {issue.confirm_count}</span>
            <span>🎯 {Math.round(issue.trust_score * 100)}%</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function IssueCardSkeleton() {
  return (
    <div
      className="flex gap-3 rounded-xl border p-3 shadow-card"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
    >
      <div className="h-20 w-20 flex-shrink-0 rounded-lg cp-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded cp-shimmer" />
        <div className="h-3 w-1/2 rounded cp-shimmer" />
        <div className="h-5 w-1/3 rounded cp-shimmer" />
      </div>
    </div>
  );
}
