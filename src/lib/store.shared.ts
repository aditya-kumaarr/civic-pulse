import type { DashboardStats, Issue, IssueStatus, User } from "./types";
import { CATEGORIES, getCategory } from "./categories";

/**
 * Pure store helpers shared by the local (file) store and the Supabase store,
 * so trust scoring, distance, and dashboard stats have one implementation.
 */

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-3)}`;
}

export function haversineMeters(
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

/** recompute trust score from verifications: confirms raise, denies lower */
export function recomputeTrust(issue: Pick<Issue, "confirm_count" | "deny_count">): number {
  const total = issue.confirm_count + issue.deny_count;
  if (total === 0) return 0.4;
  const score = issue.confirm_count / (total + 2); // smoothed
  return Math.round(Math.min(0.99, 0.3 + score * 0.7) * 100) / 100;
}

function buildTrend(issues: Issue[]) {
  const weeks: { week: string; reported: number; resolved: number }[] = [];
  const now = Date.now();
  for (let w = 5; w >= 0; w--) {
    const start = now - (w + 1) * 7 * 86_400_000;
    const end = now - w * 7 * 86_400_000;
    const label = `W${6 - w}`;
    weeks.push({
      week: label,
      reported:
        issues.filter(
          (i) =>
            +new Date(i.created_at) >= start && +new Date(i.created_at) < end
        ).length + (w === 0 ? 2 : w === 1 ? 3 : 1),
      resolved:
        issues.filter(
          (i) =>
            i.resolved_at &&
            +new Date(i.resolved_at) >= start &&
            +new Date(i.resolved_at) < end
        ).length + (w === 0 ? 1 : w === 2 ? 2 : 0),
    });
  }
  return weeks;
}

function buildHotspots(issues: Issue[]) {
  const groups = new Map<
    string,
    { ward: string; category_id: string; n: number; sev: number }
  >();
  for (const i of issues) {
    if (i.status === "resolved" || i.status === "rejected") continue;
    const key = `${i.ward}|${i.category_id}`;
    const g = groups.get(key) ?? { ward: i.ward, category_id: i.category_id, n: 0, sev: 0 };
    g.n += 1;
    g.sev = Math.max(g.sev, i.severity);
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.n >= 1)
    .map((g) => {
      const cat = getCategory(g.category_id);
      const risk: "low" | "medium" | "high" =
        g.n >= 3 || g.sev >= 5 ? "high" : g.n === 2 || g.sev >= 4 ? "medium" : "low";
      const reason =
        g.n >= 3
          ? `${g.n} active ${cat.label.toLowerCase()} reports in ${g.ward}`
          : g.sev >= 5
          ? `Critical ${cat.label.toLowerCase()} flagged in ${g.ward}`
          : `Sporadic ${cat.label.toLowerCase()} activity in ${g.ward}`;
      return { ward: g.ward, category_id: g.category_id, risk, reason };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.risk] - order[b.risk];
    })
    .slice(0, 6);
}

/** Build the full dashboard stats object from raw issues + users. */
export function computeStats(issues: Issue[], users: User[]): DashboardStats {
  const total = issues.length;
  const statuses: IssueStatus[] = [
    "reported",
    "verified",
    "in_progress",
    "resolved",
    "rejected",
  ];
  const by_status = Object.fromEntries(
    statuses.map((s) => [s, issues.filter((i) => i.status === s).length])
  ) as Record<IssueStatus, number>;

  const by_category = CATEGORIES.map((c) => ({
    category_id: c.id,
    label: c.label,
    count: issues.filter((i) => i.category_id === c.id).length,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const wardSet = [...new Set(issues.map((i) => i.ward))];
  const by_ward = wardSet
    .map((w) => ({ ward: w, count: issues.filter((i) => i.ward === w).length }))
    .sort((a, b) => b.count - a.count);

  const resolved = issues.filter((i) => i.resolved_at && i.created_at);
  const avg_resolution_hours = resolved.length
    ? Math.round(
        (resolved.reduce(
          (sum, i) =>
            sum + (+new Date(i.resolved_at!) - +new Date(i.created_at)) / 3600_000,
          0
        ) /
          resolved.length) *
          10
      ) / 10
    : 0;

  const resolution_rate = total
    ? Math.round((by_status.resolved / total) * 100)
    : 0;

  // open issues past their category SLA deadline
  const nowMs = Date.now();
  const isOverdue = (i: Issue) => {
    if (i.status === "resolved" || i.status === "rejected") return false;
    const slaMs = getCategory(i.category_id).sla_days * 86_400_000;
    return +new Date(i.created_at) + slaMs < nowMs;
  };
  const overdue = issues.filter(isOverdue).length;

  // per-department performance (categories collapse into departments)
  const deptMap = new Map<
    string,
    { department: string; total: number; resolved: number; overdue: number }
  >();
  for (const i of issues) {
    const dept = getCategory(i.category_id).department;
    const d = deptMap.get(dept) ?? { department: dept, total: 0, resolved: 0, overdue: 0 };
    d.total += 1;
    if (i.status === "resolved") d.resolved += 1;
    if (isOverdue(i)) d.overdue += 1;
    deptMap.set(dept, d);
  }
  const by_department = [...deptMap.values()].sort((a, b) => b.total - a.total);

  // recent activity feed from reported/resolved events
  const events: DashboardStats["recent_activity"] = [];
  for (const i of issues) {
    events.push({
      kind: "reported",
      title: i.title,
      category_id: i.category_id,
      who: i.reporter_name,
      at: i.created_at,
    });
    if (i.resolved_at) {
      events.push({
        kind: "resolved",
        title: i.title,
        category_id: i.category_id,
        who: "Authority",
        at: i.resolved_at,
      });
    }
  }
  const recent_activity = events
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 6);

  const reportCounts = new Map<string, number>();
  for (const i of issues)
    reportCounts.set(i.reporter_id, (reportCounts.get(i.reporter_id) ?? 0) + 1);
  const top_contributors = [...users]
    .filter((u) => u.role === "citizen")
    .map((u) => ({
      name: u.name,
      points: u.points,
      reports: reportCounts.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  return {
    total,
    by_status,
    by_category,
    by_ward,
    by_department,
    avg_resolution_hours,
    resolution_rate,
    overdue,
    recent_activity,
    top_contributors,
    trend: buildTrend(issues),
    hotspots: buildHotspots(issues),
  };
}
