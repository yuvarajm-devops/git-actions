import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AppShell, LiveClockBadge } from "@/components/infra/app-shell";
import { ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { StatusBadge, UsageBar } from "@/components/infra/status";
import { cn } from "@/lib/utils";
import { getLogs, getServer, getServerMetrics, restartService } from "@/services/infra-api";

export const Route = createFileRoute("/server/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Host ${params.id} — NodeWatch metrics` },
      {
        name: "description",
        content: `Per-host telemetry for ${params.id}: CPU, memory, network throughput, services and recent log lines.`,
      },
      { property: "og:title", content: `Host ${params.id} — NodeWatch metrics` },
      {
        property: "og:description",
        content: "Drill-down view with live resource charts, service inventory and host log stream.",
      },
    ],
  }),
  component: ServerDetailPage,
});

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
const tip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
};

function ServerDetailPage() {
  const { id } = Route.useParams();
  const [range, setRange] = useState<"6h" | "12h" | "24h">("24h");

  const server = useQuery({ queryKey: ["server", id], queryFn: () => getServer(id) });
  const metrics = useQuery({ queryKey: ["metrics", id], queryFn: () => getServerMetrics(id) });
  const logs = useQuery({ queryKey: ["logs"], queryFn: getLogs });

  const restart = useMutation({
    mutationFn: (service: string) => restartService(id, service),
    onSuccess: () => toast.success("Restart signal sent", { description: "Service is re-registering." }),
    onError: () => toast.error("Restart failed", { description: "Agent did not acknowledge." }),
  });

  const points = range === "6h" ? 12 : range === "12h" ? 24 : 48;
  const series = (metrics.data ?? []).slice(-points);
  const hostLogs = (logs.data ?? []).filter((l) => l.serverId === id).slice(0, 12);

  return (
    <AppShell
      title={server.data?.name ?? id}
      description={server.data ? `${server.data.hostname} · ${server.data.role}` : "Loading host…"}
      actions={<LiveClockBadge />}
    >
      <div className="space-y-6">
        <Link
          to="/servers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
        </Link>

        {server.isPending ? (
          <LoadingBlock rows={3} />
        ) : server.isError ? (
          <ErrorState message={(server.error as Error).message} onRetry={() => server.refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            <Panel className="lg:col-span-2" title="Host" subtitle={server.data!.os}>
              <div className="flex items-center justify-between">
                <StatusBadge status={server.data!.status} />
                <span className="font-mono text-xs text-muted-foreground">
                  {server.data!.status === "offline"
                    ? "no heartbeat"
                    : `up ${Math.floor(server.data!.uptimeHours / 24)}d ${server.data!.uptimeHours % 24}h`}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
                <Field label="IP" value={server.data!.ip} />
                <Field label="Provider" value={`${server.data!.provider} · ${server.data!.region}`} />
                <Field label="Environment" value={server.data!.environment} />
                <Field
                  label="Shape"
                  value={`${server.data!.cores} vCPU / ${server.data!.memoryTotalGb} GB / ${server.data!.diskTotalGb} GB`}
                />
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {server.data!.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-border bg-panel px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title="Saturation" className="lg:col-span-1">
              <div className="space-y-4">
                <UsageBar value={server.data!.cpu} label="CPU" />
                <UsageBar value={server.data!.memory} label="MEMORY" />
                <UsageBar value={server.data!.disk} label="DISK" />
                <p className="font-mono text-[11px] text-muted-foreground">
                  net {server.data!.network} Mbps
                </p>
              </div>
            </Panel>

            <Panel title="Services" className="lg:col-span-1">
              <ul className="space-y-3">
                {server.data!.services.map((svc) => (
                  <li key={svc.name} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{svc.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">:{svc.port}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={svc.status} />
                      <button
                        onClick={() => restart.mutate(svc.name)}
                        disabled={restart.isPending}
                        aria-label={`Restart ${svc.name}`}
                        className="rounded border border-border p-1.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                      >
                        {restart.isPending && restart.variables === svc.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCw className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        <Panel
          title="Resource utilisation"
          subtitle="CPU and memory percent, 30-minute resolution"
          action={
            <div className="flex gap-1 rounded-md border border-border bg-panel p-1">
              {(["6h", "12h", "24h"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded px-2 py-1 font-mono text-[11px]",
                    range === r ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          {metrics.isPending ? (
            <LoadingBlock rows={5} />
          ) : metrics.isError ? (
            <ErrorState onRetry={() => metrics.refetch()} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" {...axis} interval={Math.floor(points / 8)} />
                <YAxis {...axis} width={36} domain={[0, 100]} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU %"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#cpuFill)"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  name="Memory %"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Network & latency" subtitle="Throughput (Mbps) and response time (ms)">
            {metrics.isPending ? (
              <LoadingBlock rows={4} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={series}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" {...axis} interval={Math.floor(points / 6)} />
                  <YAxis {...axis} width={40} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="network" name="Mbps" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="latency" name="ms" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Host log stream" subtitle="Last 12 lines from this node">
            {logs.isPending ? (
              <LoadingBlock rows={5} />
            ) : hostLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No log lines for this host.</p>
            ) : (
              <ul className="space-y-1.5 font-mono text-[11px]">
                {hostLogs.map((l) => (
                  <li key={l.id} className="flex gap-2 rounded bg-panel px-2 py-1.5">
                    <span className="text-muted-foreground">{l.ts.slice(11, 19)}</span>
                    <span
                      className={cn(
                        "w-10 shrink-0 uppercase",
                        l.level === "error" && "text-crit",
                        l.level === "warn" && "text-warn",
                        l.level === "info" && "text-info",
                        l.level === "debug" && "text-muted-foreground",
                      )}
                    >
                      {l.level}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-foreground/90">{l.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 break-words text-foreground">{value}</dd>
    </div>
  );
}
