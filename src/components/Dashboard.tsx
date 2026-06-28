"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trophy,
  Flame,
  Activity,
} from "lucide-react";
import type { DashboardStats, User } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { cn, timeAgo } from "@/lib/utils";

const PIE_COLORS = [
  "#4A36B3", "#7C6FF0", "#22c55e", "#f59e0b", "#06b6d4",
  "#10b981", "#d946ef", "#ef4444", "#64748b", "#3b82f6",
];

export function Dashboard({ stats, users }: { stats: DashboardStats; users: User[] }) {
  const statusData = [
    { name: "Reported",    value: stats.by_status.reported,    color: "#8898AA" },
    { name: "Verified",    value: stats.by_status.verified,    color: "#4A36B3" },
    { name: "In Progress", value: stats.by_status.in_progress, color: "#f59e0b" },
    { name: "Resolved",    value: stats.by_status.resolved,    color: "#22c55e" },
  ].filter((d) => d.value > 0);

  // One bar per department = total reports; bar turns red if any are overdue.
  const deptData = stats.by_department.map((d) => ({
    department: d.department,
    total: d.total,
    overdue: d.overdue,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Impact Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Live civic intelligence — transparency for the whole community.
          </p>
        </div>
        <span
          className="hidden rounded-md px-3 py-1 text-xs font-semibold sm:inline"
          style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}
        >
          ● Live
        </span>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Activity className="h-5 w-5" />}
          label="Total reports"
          value={stats.total}
          iconStyle={{ background: "rgba(74,54,179,0.1)", color: "#4A36B3" }}
        />
        <Kpi
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Resolution rate"
          value={`${stats.resolution_rate}%`}
          iconStyle={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}
        />
        <Kpi
          icon={<Clock className="h-5 w-5" />}
          label="Avg resolution"
          value={stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : "—"}
          iconStyle={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}
        />
        <Kpi
          icon={<AlertTriangle className="h-5 w-5" />}
          label="SLA overdue"
          value={stats.overdue}
          iconStyle={
            stats.overdue > 0
              ? { background: "rgba(220,38,38,0.1)", color: "#dc2626" }
              : { background: "rgba(34,197,94,0.1)", color: "#16a34a" }
          }
        />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Reports vs Resolutions" subtitle="Last 6 weeks">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4A36B3" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4A36B3" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#8898AA" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#8898AA" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="reported" name="Reported" stroke="#4A36B3" strokeWidth={2} fill="url(#gR)" />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} fill="url(#gS)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Status breakdown" subtitle="Where reports stand">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {statusData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Categories + leaderboard */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Reports by category" subtitle="What the community reports most">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stats.by_category}
              layout="vertical"
              margin={{ left: 20, right: 16, top: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#8898AA" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12, fill: "#425466" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F0F2F5" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {stats.by_category.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top contributors" subtitle="Community heroes">
          <div className="space-y-2">
            {stats.top_contributors.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center gap-3 rounded-xl p-2.5 border"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--divider)" }}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-sm font-bold",
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                      ? "bg-slate-200 text-slate-700"
                      : i === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {c.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {c.reports} reports
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <Trophy className="h-3 w-3" /> {c.points}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Department performance */}
      <div className="mt-4">
        <Card title="Department performance" subtitle="Reports per department — red = SLA overdue">
          <ResponsiveContainer width="100%" height={Math.max(200, deptData.length * 40)}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 4, right: 16, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#8898AA" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 11, fill: "#425466" }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F0F2F5" }} />
              <Bar dataKey="total" name="Reports" radius={[0, 6, 6, 0]}>
                {deptData.map((d, i) => (
                  <Cell key={i} fill={d.overdue > 0 ? "#dc2626" : "#4A36B3"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Reports by area — full width, compact (only a couple of areas) */}
      <div className="mt-4">
        <Card title="Reports by area" subtitle="Where issues are concentrated">
          <ResponsiveContainer width="100%" height={Math.max(120, stats.by_ward.length * 46)}>
            <BarChart data={stats.by_ward} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#8898AA" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="ward"
                tick={{ fontSize: 12, fill: "#425466" }}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F0F2F5" }} />
              <Bar dataKey="count" name="Reports" radius={[0, 6, 6, 0]} fill="#4A36B3" barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent activity — full width, two columns on desktop */}
      <div className="mt-4">
        <Card title="Recent activity" subtitle="Latest reports & resolutions">
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {stats.recent_activity.map((a, i) => {
              const cat = getCategory(a.category_id);
              const resolved = a.kind === "resolved";
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm"
                    style={{ background: resolved ? "rgba(34,197,94,0.12)" : "var(--accent-soft)" }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: "var(--text)" }}>
                      <span style={{ color: resolved ? "#16a34a" : "var(--accent)" }}>
                        {resolved ? "Resolved" : "Reported"}
                      </span>{" "}
                      · {a.title}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {a.who} · {timeAgo(a.at)}
                    </div>
                  </div>
                </div>
              );
            })}
            {stats.recent_activity.length === 0 && (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                No activity yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Predictive hotspots */}
      <div className="mt-4">
        <Card
          title="Predictive insights"
          subtitle="AI-flagged risk zones — proactive, not reactive"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {stats.hotspots.map((h, i) => {
              const cat = getCategory(h.category_id);
              const riskStyle =
                h.risk === "high"
                  ? { background: "rgba(220,38,38,0.06)", borderColor: "rgba(220,38,38,0.2)" }
                  : h.risk === "medium"
                  ? { background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }
                  : { background: "var(--bg-subtle)", borderColor: "var(--divider)" };
              const riskPillStyle =
                h.risk === "high"
                  ? { background: "rgba(220,38,38,0.1)", color: "#dc2626" }
                  : h.risk === "medium"
                  ? { background: "rgba(245,158,11,0.1)", color: "#d97706" }
                  : { background: "var(--bg-subtle)", color: "var(--text-tertiary)" };
              return (
                <div key={i} className="rounded-xl border p-3" style={riskStyle}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text)" }}>
                      <span className="shrink-0">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={riskPillStyle}>
                      {h.risk} risk
                    </span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {h.reason}
                  </div>
                </div>
              );
            })}
            {stats.hotspots.length === 0 && (
              <div
                className="rounded-xl border border-dashed p-6 text-center text-sm"
                style={{ borderColor: "var(--divider)", color: "var(--text-tertiary)" }}
              >
                <AlertTriangle className="mx-auto mb-1 h-5 w-5" />
                No active risk zones detected right now.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #E3E8EE",
  background: "#FFFFFF",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(10,37,64,0.08)",
};

function Kpi({
  icon,
  label,
  value,
  iconStyle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconStyle: React.CSSProperties;
}) {
  return (
    <div
      className="rounded-xl border p-4 shadow-card"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={iconStyle}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold" style={{ color: "var(--text)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4 shadow-card"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--divider)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text)" }}>
            {icon} {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
