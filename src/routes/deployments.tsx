import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, GitCommitHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell, LiveClockBadge } from "@/components/infra/app-shell";
import { EmptyState, ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { StatusBadge } from "@/components/infra/status";
import { cn } from "@/lib/utils";
import { getDeployments } from "@/services/infra-api";

export const Route = createFileRoute("/deployments")({
  head: () => ({
    meta: [
      { title: "Deployments — NodeWatch release pipeline" },
      {
        name: "description",
        content: "Release history with pipeline stages, durations, commit metadata and rollback status.",
      },
      { property: "og:title", content: "Deployments — NodeWatch release pipeline" },
      {
        property: "og:description",
        content: "Track build, test and deploy stages for every service release.",
      },
    ],
  }),
  component: DeploymentsPage,
});

const FILTERS = ["all", "success", "failed", "running", "rolled_back"] as const;

function DeploymentsPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["deployments"],
    queryFn: getDeployments,
  });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () => (data ?? []).filter((d) => filter === "all" || d.status === filter),
    [data, filter],
  );

  const stats = useMemo(() => {
    const done = (data ?? []).filter((d) => d.status !== "running");
    return {
      total: data?.length ?? 0,
      success: done.filter((d) => d.status === "success").length,
      failed: done.filter((d) => d.status === "failed").length,
      avg: done.length
        ? Math.round(done.reduce((a, d) => a + d.durationSec, 0) / done.length / 60)
        : 0,
    };
  }, [data]);

  return (
    <AppShell
      title="Deployments"
      description="Release pipeline activity across all environments"
      actions={<LiveClockBadge />}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Metric label="Total runs" value={String(stats.total)} />
          <Metric label="Succeeded" value={String(stats.success)} tone="ok" />
          <Metric label="Failed" value={String(stats.failed)} tone="crit" />
          <Metric label="Avg duration" value={`${stats.avg}m`} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors",
                filter === f
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-panel text-muted-foreground hover:text-foreground",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        <Panel title="Run history" subtitle="Select a run to expand its pipeline stages">
          {isPending ? (
            <LoadingBlock rows={6} />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : list.length === 0 ? (
            <EmptyState title="No runs with this status" />
          ) : (
            <ul className="divide-y divide-border">
              {list.map((d) => {
                const expanded = open === d.id;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setOpen(expanded ? null : d.id)}
                      className="flex w-full flex-col gap-2 py-3 text-left sm:flex-row sm:items-center sm:gap-4"
                      aria-expanded={expanded}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {d.service}{" "}
                            <span className="font-mono text-xs text-muted-foreground">{d.version}</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{d.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pl-7 font-mono text-[11px] text-muted-foreground sm:pl-0">
                        <span className="flex items-center gap-1">
                          <GitCommitHorizontal className="h-3.5 w-3.5" />
                          {d.commit}
                        </span>
                        <span>{d.author}</span>
                        <span>{d.environment}</span>
                        <span>{Math.floor(d.durationSec / 60)}m {d.durationSec % 60}s</span>
                        <span>{d.startedAt.slice(5, 16).replace("T", " ")}</span>
                        <StatusBadge status={d.status} />
                      </div>
                    </button>

                    {expanded && (
                      <div className="mb-3 ml-7 grid gap-2 rounded-md border border-border bg-panel p-3 sm:grid-cols-4">
                        {d.pipeline.map((stage) => (
                          <div key={stage.name} className="rounded border border-border/70 p-2.5">
                            <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                              {stage.name}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <StatusBadge status={stage.status} />
                              <span className="font-mono text-[11px] text-muted-foreground">{stage.sec}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "crit" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold",
          tone === "ok" && "text-ok",
          tone === "crit" && "text-crit",
        )}
      >
        {value}
      </p>
    </div>
  );
}
