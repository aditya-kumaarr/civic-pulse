"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Send,
  Clock,
  ShieldCheck,
  Loader2,
  Gauge,
} from "lucide-react";
import type { Issue, Verification, TimelineEvent, Comment, IssueStatus } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { StatusBadge, Badge, SlaPill } from "@/components/ui/Badge";
import {
  severityLabel,
  severityColor,
  timeAgo,
  formatDate,
  cn,
} from "@/lib/utils";

const STATUS_FLOW: { status: IssueStatus; label: string }[] = [
  { status: "reported", label: "Reported" },
  { status: "verified", label: "Verified" },
  { status: "in_progress", label: "In Progress" },
  { status: "resolved", label: "Resolved" },
];

export function IssueDetail({
  issue: initial,
  verifications: initialVerif,
  timeline: initialTl,
  comments: initialComments,
}: {
  issue: Issue;
  verifications: Verification[];
  timeline: TimelineEvent[];
  comments: Comment[];
}) {
  const router = useRouter();
  const [issue, setIssue] = useState(initial);
  const [verifications, setVerifications] = useState(initialVerif);
  const [timeline, setTimeline] = useState(initialTl);
  const [comments, setComments] = useState(initialComments);
  const [voting, setVoting] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const cat = getCategory(issue.category_id);

  async function vote(type: "confirm" | "deny") {
    setVoting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, user: { id: "u_demo", name: "You (Demo)" } }),
      });
      const data = await res.json();
      if (data.issue) {
        setIssue(data.issue);
        router.refresh();
        const v = await fetch(`/api/issues/${issue.id}`).then((r) => r.json());
        setVerifications(v.verifications);
      }
    } finally {
      setVoting(false);
    }
  }

  async function postComment() {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: comment,
          user: { id: "u_demo", name: "You (Demo)" },
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((c) => [...c, data.comment]);
        setComment("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function changeStatus(status: IssueStatus) {
    setStatusBusy(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, by_user: "You (Demo)" }),
      });
      const data = await res.json();
      if (data.issue) {
        setIssue(data.issue);
        const v = await fetch(`/api/issues/${issue.id}`).then((r) => r.json());
        setTimeline(v.timeline);
        router.refresh();
      }
    } finally {
      setStatusBusy(false);
    }
  }

  const flowIdx = STATUS_FLOW.findIndex((s) => s.status === issue.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <Link
        href="/"
        className="mb-3 -ml-1 inline-flex items-center gap-1 px-1 py-2 text-sm font-medium transition hover:opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div className="space-y-4">
          {/* image + header */}
          <div
            className="overflow-hidden rounded-xl border shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <div className="relative h-56 w-full sm:h-72" style={{ background: "var(--bg-subtle)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={issue.image_url}
                alt={issue.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow">
                  {cat.icon} {cat.label}
                </span>
                <StatusBadge status={issue.status} />
              </div>
            </div>
            <div className="p-4">
              <h1 className="text-xl font-bold break-words" style={{ color: "var(--text)" }}>{issue.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {issue.location_name}
                </span>
                <span>· {issue.ward}</span>
                <span>· reported {timeAgo(issue.created_at)} by {issue.reporter_name}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className={severityColor(issue.severity)}>
                  <Gauge className="h-3 w-3" /> {severityLabel(issue.severity)}
                </Badge>
                <Badge className="border-[var(--divider)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                  {cat.department}
                </Badge>
                <SlaPill issue={issue} />
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  🎯 {Math.round(issue.trust_score * 100)}% trust
                </Badge>
              </div>
              {issue.description && (
                <p className="mt-3 text-sm leading-relaxed break-words" style={{ color: "var(--text-secondary)" }}>
                  {issue.description}
                </p>
              )}
            </div>
          </div>

          {/* verification actions */}
          <div
            className="rounded-xl border p-4 shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                Community verification
              </h2>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {issue.confirm_count} confirm · {issue.deny_count} deny
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Seen this issue too? Your confirmation raises its trust score and
              helps authorities prioritise it.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                disabled={voting}
                onClick={() => vote("confirm")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {voting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                I confirm this
              </button>
              <button
                disabled={voting}
                onClick={() => vote("deny")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                <ThumbsDown className="h-4 w-4" /> Not real
              </button>
            </div>

            {/* verifiers */}
            {verifications.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {verifications.slice(0, 8).map((v) => (
                  <span
                    key={v.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      v.type === "confirm"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    {v.type === "confirm" ? "👍" : "👎"} {v.user_name}
                  </span>
                ))}
                {verifications.length > 8 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}
                  >
                    +{verifications.length - 8} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* comments */}
          <div
            className="rounded-xl border p-4 shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Comments ({comments.length})
            </h2>
            <div className="mt-3 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                  >
                    {c.user_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.user_name}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm break-words" style={{ color: "var(--text-secondary)" }}>{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No comments yet — start the conversation.
                </p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
                placeholder="Add a comment…"
                className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text)" }}
              />
              <button
                disabled={posting || !comment.trim()}
                onClick={postComment}
                className="grid place-items-center rounded-xl px-3.5 text-white transition hover:brightness-95 disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* status flow */}
          <div
            className="rounded-xl border p-4 shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Status</h2>
            <div className="mt-3 space-y-1">
              {STATUS_FLOW.map((s, i) => {
                const done = i <= flowIdx;
                const current = i === flowIdx;
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition"
                      style={
                        done
                          ? { background: "var(--accent)", color: "#fff" }
                          : { background: "var(--bg-subtle)", color: "var(--text-tertiary)" }
                      }
                    >
                      {done && !current ? "✓" : i + 1}
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: current
                          ? "var(--text)"
                          : done
                          ? "var(--text-secondary)"
                          : "var(--text-tertiary)",
                        fontWeight: current ? 600 : 400,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* authority actions (demo) */}
            <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--divider)" }}>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                <ShieldCheck className="h-3.5 w-3.5" /> Authority actions
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBtn busy={statusBusy} onClick={() => changeStatus("in_progress")}>
                  Start work
                </StatusBtn>
                <StatusBtn busy={statusBusy} onClick={() => changeStatus("resolved")}>
                  Mark resolved
                </StatusBtn>
                <StatusBtn busy={statusBusy} onClick={() => changeStatus("reported")}>
                  Reopen
                </StatusBtn>
              </div>
            </div>
          </div>

          {/* timeline */}
          <div
            className="rounded-xl border p-4 shadow-card"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
          >
            <h2 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--text)" }}>
              <Clock className="h-4 w-4" /> Timeline
            </h2>
            <div className="mt-3 space-y-3">
              {timeline.map((t, i) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                    {i < timeline.length - 1 && (
                      <div className="w-px flex-1" style={{ background: "var(--divider)" }} />
                    )}
                  </div>
                  <div className="-mt-0.5 pb-1">
                    <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.note}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {formatDate(t.created_at)} · {t.by_user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBtn({
  children,
  onClick,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="rounded-lg border px-3 py-2.5 text-xs font-semibold transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
      style={{ borderColor: "var(--divider)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
    >
      {busy ? "…" : children}
    </button>
  );
}
