import { cn, severityLabel, slaStatus } from "@/lib/utils";
import type { Issue } from "@/lib/types";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.reported;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
      style={meta.style}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ background: meta.dotColor }}
      />
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: number | string }) {
  const num = typeof severity === "string" ? parseInt(severity) || 0 : severity;
  const s =
    num >= 5
      ? { bg: "rgba(220,38,38,0.08)", color: "#dc2626", border: "rgba(220,38,38,0.25)" }
      : num === 4
      ? { bg: "rgba(234,88,12,0.08)", color: "#ea580c", border: "rgba(234,88,12,0.25)" }
      : num === 3
      ? { bg: "rgba(245,158,11,0.08)", color: "#d97706", border: "rgba(245,158,11,0.25)" }
      : { bg: "var(--bg-subtle)", color: "var(--text-secondary)", border: "var(--divider)" };
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {severityLabel(num)}
    </span>
  );
}

export function SlaPill({ issue }: { issue: Issue }) {
  const { state, label } = slaStatus(issue);
  if (state === "none" || !label) return null;
  const s =
    state === "overdue"
      ? { bg: "rgba(220,38,38,0.10)", color: "#dc2626", border: "rgba(220,38,38,0.3)" }
      : state === "soon"
      ? { bg: "rgba(245,158,11,0.12)", color: "#b45309", border: "rgba(245,158,11,0.3)" }
      : { bg: "rgba(34,197,94,0.12)", color: "#15803d", border: "rgba(34,197,94,0.3)" };
  const Icon = state === "overdue" ? AlertTriangle : state === "resolved" ? CheckCircle2 : Clock;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

const STATUS_META: Record<
  string,
  { label: string; style: React.CSSProperties; dotColor: string }
> = {
  reported: {
    label: "Reported",
    style: {
      background: "rgba(148,163,184,0.12)",
      color: "#64748b",
      border: "1px solid rgba(100,116,139,0.25)",
    },
    dotColor: "#94a3b8",
  },
  verified: {
    label: "Verified",
    style: {
      background: "rgba(74,54,179,0.08)",
      color: "#4A36B3",
      border: "1px solid rgba(74,54,179,0.25)",
    },
    dotColor: "#4A36B3",
  },
  in_progress: {
    label: "In Progress",
    style: {
      background: "rgba(245,158,11,0.1)",
      color: "#d97706",
      border: "1px solid rgba(245,158,11,0.3)",
    },
    dotColor: "#f59e0b",
  },
  resolved: {
    label: "Resolved",
    style: {
      background: "rgba(34,197,94,0.1)",
      color: "#16a34a",
      border: "1px solid rgba(34,197,94,0.3)",
    },
    dotColor: "#22c55e",
  },
  rejected: {
    label: "Rejected",
    style: {
      background: "rgba(220,38,38,0.08)",
      color: "#dc2626",
      border: "1px solid rgba(220,38,38,0.25)",
    },
    dotColor: "#ef4444",
  },
};
