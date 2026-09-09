import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/infra/app-shell";
import { EmptyState, ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { cn } from "@/lib/utils";
import { getLogs, getServers, type LogLevel } from "@/services/infra-api";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs — NodeWatch log explorer" },
      {
        name: "description",
        content: "Filter aggregated host logs by severity, source host and free-text search in a live stream view.",
      },
      { property: "og:title", content: "Logs — NodeWatch log explorer" },
      {
        property: "og:description",
        content: "Aggregated log stream with severity filters and per-host scoping.",
      },
    ],
  }),
  component: LogsPage,
});

const LEVELS: ("all" | LogLevel)[] = ["all", "error", "warn", "info", "debug"];

const LEVEL_CLASS: Record<LogLevel, string> = {
  error: "text-crit",
  warn: "text-warn",
  info: "text-info",
  debug: "text-muted-foreground",
};

function LogsPage() {
  const logs = useQuery({ queryKey: ["logs"], queryFn: getLogs });
  const servers = useQuery({ queryKey: ["servers"], queryFn: getServers });
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [host, setHost] = useState("all");
  const [q, setQ] = useState("");
  const [streaming, setStreaming] = useState(true);

  const filtered = useMemo(() => {
    return (logs.data ?? []).filter(
      (l) =>
        (level === "all" || l.level === level) &&
        (host === "all" || l.serverId === host) &&
        (q.trim() === "" ||
          l.message.toLowerCase().includes(q.toLowerCase()) ||
          l.source.toLowerCase().includes(q.toLowerCase())),
    );
  }, [logs.data, level, host, q]);

  const counts = useMemo(() => {
    const base = { error: 0, warn: 0, info: 0, debug: 0 } as Record<LogLevel, number>;
    (logs.data ?? []).forEach((l) => (base[l.level] += 1));
    return base;
  }, [logs.data]);

  return (
    <AppShell
      title="Log explorer"
      description="Aggregated stdout/stderr from every agent"
      actions={
        <button
          onClick={() => setStreaming((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
            streaming ? "border-ok/30 bg-ok/10 text-ok" : "border-border bg-panel text-muted-foreground",
          )}
        >
          {streaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {streaming ? "streaming" : "paused"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {(["error", "warn", "info", "debug"] as LogLevel[]).map((l) => (
            <div key={l} className="rounded-lg border border-border bg-card p-4">
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{l}</p>
              <p className={cn("mt-2 font-display text-2xl font-semibold", LEVEL_CLASS[l])}>{counts[l]}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="grep messages and sources…"
              className="w-full rounded-md border border-border bg-panel py-2 pr-3 pl-9 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] uppercase transition-colors",
                  level === l
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-panel text-muted-foreground hover:text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <select
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="rounded-md border border-border bg-panel px-3 py-2 font-mono text-xs outline-none focus:border-primary/60"
          >
            <option value="all">all hosts</option>
            {(servers.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <Panel
          title="Stream"
          subtitle={`${filtered.length} matching lines${streaming ? "" : " · stream paused"}`}
        >
          {logs.isPending ? (
            <LoadingBlock rows={8} />
          ) : logs.isError ? (
            <ErrorState message={(logs.error as Error).message} onRetry={() => logs.refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No log lines match" hint="Loosen the filters or clear the search." />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border border-border bg-panel">
              <ul className="divide-y divide-border/60 font-mono text-[11.5px] leading-relaxed">
                {filtered.slice(0, 120).map((l) => (
                  <li key={l.id} className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 hover:bg-accent/40">
                    <span className="text-muted-foreground">{l.ts.slice(11, 19)}</span>
                    <span className={cn("w-10 shrink-0 uppercase", LEVEL_CLASS[l.level])}>{l.level}</span>
                    <span className="text-primary/80">{l.source}</span>
                    <span className="text-muted-foreground">{l.serverId}</span>
                    <span className="min-w-0 flex-1 break-words text-foreground/90">{l.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
