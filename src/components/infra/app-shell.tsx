import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  LayoutDashboard,
  Menu,
  Rocket,
  ScrollText,
  Server,
  Terminal,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/servers", label: "Servers", icon: Server, exact: false },
  { to: "/deployments", label: "Deployments", icon: Rocket, exact: false },
  { to: "/logs", label: "Logs", icon: ScrollText, exact: false },
  { to: "/alerts", label: "Alerts", icon: BellRing, exact: false },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Terminal className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-tight">NodeWatch</p>
            <p className="font-mono text-[10px] text-muted-foreground">infra control plane</p>
          </div>
          <button
            className="ml-auto text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-md border border-border bg-panel p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              <Activity className="h-3 w-3 text-ok" /> region us-east-1
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Scrape interval <span className="font-mono text-foreground">15s</span>
            </p>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="text-muted-foreground lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
                {title}
              </h1>
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function LiveClockBadge() {
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 font-mono text-[11px] text-ok sm:inline-flex">
      <span className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-ok" />
      live
    </span>
  );
}
