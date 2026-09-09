import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, LiveClockBadge } from "@/components/infra/app-shell";
import { EmptyState, ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { HealthDot, StatusBadge, UsageBar } from "@/components/infra/status";
import { cn } from "@/lib/utils";
import { getServers, type ServerStatus } from "@/services/infra-api";

export const Route = createFileRoute("/servers")({
  head: () => ({
    meta: [
      { title: "Servers — NodeWatch fleet inventory" },
      {
        name: "description",
        content:
          "Searchable inventory of every host: status, environment, region, CPU, memory and disk saturation.",
      },
      { property: "og:title", content: "Servers — NodeWatch fleet inventory" },
      {
        property: "og:description",
        content: "Filter hosts by status and environment, then drill into per-host metrics.",
      },
    ],
  }),
  component: ServersPage,
});

const STATUS_FILTERS: ("all" | ServerStatus)[] = ["all", "healthy", "warning", "critical", "offline"];
const ENVS = ["all", "production", "staging", "development"] as const;

function ServersPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [env, setEnv] = useState<(typeof ENVS)[number]>("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const filtered = useMemo(() => {
    return (data ?? []).filter((s) => {
      const matchQ =
        q.trim() === "" ||
        [s.name, s.hostname, s.ip, s.role, s.region].some((v) =>
          v.toLowerCase().includes(q.toLowerCase()),
        );
      return matchQ && (status === "all" || s.status === status) && (env === "all" || s.environment === env);
    });
  }, [data, q, status, env]);

  return (
    <AppShell
      title="Servers"
      description="Inventory and live saturation for every monitored host"
      actions={<LiveClockBadge />}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, hostname, IP, role…"
              className="w-full rounded-md border border-border bg-panel py-2 pr-3 pl-9 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <Chip key={f} active={status === f} onClick={() => setStatus(f)}>
                {f}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ENVS.map((e) => (
              <Chip key={e} active={env === e} onClick={() => setEnv(e)}>
                {e}
              </Chip>
            ))}
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-panel p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={cn("rounded p-1.5", view === "grid" ? "bg-accent text-primary" : "text-muted-foreground")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              aria-label="Table view"
              className={cn("rounded p-1.5", view === "table" ? "bg-accent text-primary" : "text-muted-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isPending ? (
          <LoadingBlock rows={6} />
        ) : isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No hosts match these filters" hint="Clear the search box or pick another status." />
        ) : view === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to="/server/$id"
                params={{ id: s.id }}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold group-hover:text-primary">
                      <HealthDot status={s.status} />
                      {s.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{s.hostname}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <div>{s.provider} · {s.region}</div>
                  <div className="text-right">{s.cores} vCPU / {s.memoryTotalGb} GB</div>
                  <div>{s.ip}</div>
                  <div className="text-right">
                    {s.status === "offline" ? "—" : `${Math.floor(s.uptimeHours / 24)}d uptime`}
                  </div>
                </dl>
                <div className="mt-3 space-y-2">
                  <UsageBar value={s.cpu} label="CPU" />
                  <UsageBar value={s.memory} label="MEMORY" />
                  <UsageBar value={s.disk} label="DISK" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Panel className="overflow-hidden" >
            <div className="-m-4 overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr className="border-b border-border font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-3 text-left">Host</th>
                    <th className="px-4 py-3 text-left">Env</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-right">CPU</th>
                    <th className="px-4 py-3 text-right">Memory</th>
                    <th className="px-4 py-3 text-right">Disk</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/server/$id"
                          params={{ id: s.id }}
                          className="font-medium hover:text-primary"
                        >
                          {s.name}
                        </Link>
                        <div className="font-mono text-[11px] text-muted-foreground">{s.ip}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.environment}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.role}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{s.cpu}%</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{s.memory}%</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{s.disk}%</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-panel text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
