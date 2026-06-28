"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinned, Plus, BarChart3, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",          label: "Map",       icon: MapPinned },
  { href: "/issues",    label: "Issues",    icon: LayoutDashboard },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <>
      {/* Top bar */}
      <header
        className="sticky top-0 z-[1000] border-b backdrop-blur-md"
        style={{
          borderColor: "var(--divider)",
          background: "rgba(255,255,255,0.88)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg text-white"
              style={{ background: "var(--accent)" }}
            >
              <MapPinned className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Civic<span style={{ color: "var(--accent)" }}>Pulse</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  )}
                  style={
                    active
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { color: "var(--text-secondary)" }
                  }
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link
              href="/report"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition"
              style={{ background: "var(--accent)" }}
            >
              <Plus className="h-4 w-4" />
              Report
            </Link>
          </nav>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-around border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderColor: "var(--divider)",
        }}
      >
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
              style={{ color: active ? "var(--accent)" : "var(--text-tertiary)" }}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
        <Link
          href="/report"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold"
          style={{ color: "var(--accent)" }}
        >
          <div
            className="grid h-8 w-8 place-items-center rounded-full shadow-md text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus className="h-5 w-5" />
          </div>
          Report
        </Link>
      </nav>
    </>
  );
}
