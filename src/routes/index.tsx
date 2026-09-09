import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Cpu, Gauge, MemoryStick, Rocket, ShieldAlert, Timer } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, LiveClockBadge } from "@/components/infra/app-shell";
import { EmptyState, ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { HealthDot, StatusBadge, UsageBar } from "@/components/infra/status";
import {
  getAlerts,
  getClusterSummary,
  getDeployments,
  getServers,
  getTrafficSeries,
} from "@/services/infra-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NodeWatch — DevOps Server Dashboard" },
      {
        name: "description",
        content:
          "Live fleet overview: server health, CPU and memory saturation, deployment success rate and open infrastructure alerts.",
      },
      { property: "og:title", content: "NodeWatch — DevOps Server Dashboard" },
      {
        property: "og:description",
        content: "Internal infrastructure monitoring: fleet health, deployments, logs and alerts.",
      },
    ],
  }),
  component: OverviewPage,
});

const chartAxis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: "var(--muted-foreground)" },
  };
}

function OverviewPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: getClusterSummary });
  const traffic = useQuery({ queryKey: ["traffic"], queryFn: getTrafficSeries });
  const servers = useQuery({ queryKey: ["servers"], queryFn: getServers });
  const deployments = useQuery({ queryKey: ["deployments"], queryFn: getDeployments });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });

  const s = summary.data;

  return (
    <AppShell
      title="Fleet overview"
      description="14 hosts across production, staging and development"
      actions={<LiveClockBadge />}
    >
      <div className="space-y-6">
        {/* KPI row */}
        {summary.isPending ? (
          <LoadingBlock rows={2} />
        ) : summary.isError ? (
          <ErrorState message={(summary.error as Error).message} onRetry={() => summary.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<Gauge className="h-4 w-4" />}
              label="Fleet uptime"
              value={`${s!.uptime}%`}
              detail={`${s!.healthy} healthy · ${s!.warning} warning · ${s!.critical} critical`}
            />
            <Kpi
              icon={<Cpu className="h-4 w-4" />}
              label="Avg CPU"
              value={`${s!.avgCpu}%`}
              detail={`${s!.requestsPerMin.toLocaleString()} req/min ingress`}
            />
            <Kpi
              icon={<MemoryStick className="h-4 w-4" />}
              label="Avg memory"
              value={`${s!.avgMemory}%`}
              detail={`error rate ${s!.errorRate}%`}
            />
            <Kpi
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Open alerts"
              value={String(s!.openAlerts)}
              detail={`${s!.deploysToday} deploys · ${s!.successRate}% success`}
              tone={s!.openAlerts > 0 ? "warn" : "ok"}
            />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Ingress traffic (24h)"
            subtitle="Requests per hour vs. 5xx responses"
            className="xl:col-span-2"
          >
            {traffic.isPending ? (
              <LoadingBlock rows={5} />
            ) : traffic.isError ? (
              <ErrorState onRetry={() => traffic.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={traffic.data}>
                  <defs>
                    <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" {...chartAxis} interval={3} />
                  <YAxis {...chartAxis} width={44} />
                  <Tooltip {...tooltipStyle()} />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#reqFill)"
                  />
                  <Line type="monotone" dataKey="errors" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="p95 latency" subtitle="Edge to origin, milliseconds">
            {traffic.isPending ? (
              <LoadingBlock rows={5} />
            ) : traffic.isError ? (
              <ErrorState onRetry={() => traffic.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={traffic.data}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" {...chartAxis} interval={5} />
                  <YAxis {...chartAxis} width={36} />
                  <Tooltip {...tooltipStyle()} />
                  <Bar dataKey="p95" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Hosts under pressure"
            subtitle="Sorted by CPU saturation"
            className="xl:col-span-2"
            action={
              <Link
                to="/servers"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All servers <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {servers.isPending ? (
              <LoadingBlock />
            ) : servers.isError ? (
              <ErrorState onRetry={() => servers.refetch()} />
            ) : (
              <ul className="divide-y divide-border">
                {[...servers.data!]
                  .sort((a, b) => b.cpu - a.cpu)
                  .slice(0, 5)
                  .map((srv) => (
                    <li key={srv.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/server/$id"
                          params={{ id: srv.id }}
                          className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                        >
                          <HealthDot status={srv.status} />
                          {srv.name}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {srv.hostname} · {srv.region}
                        </p>
                      </div>
                      <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-xs">
                        <UsageBar value={srv.cpu} label="CPU" />
                        <UsageBar value={srv.memory} label="MEM" />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Recent deployments"
            action={
              <Link
                to="/deployments"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Pipeline <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          >
            {deployments.isPending ? (
              <LoadingBlock />
            ) : deployments.isError ? (
              <ErrorState onRetry={() => deployments.refetch()} />
            ) : (
              <ul className="space-y-3">
                {deployments.data!.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex items-start gap-3">
                    <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {d.service} <span className="font-mono text-xs text-muted-foreground">{d.version}</span>
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {d.commit} · {d.author} · {Math.round(d.durationSec / 60)}m
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="Active alerts"
          subtitle="Unacknowledged first"
          action={
            <Link to="/alerts" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Alert center <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {alerts.isPending ? (
            <LoadingBlock rows={3} />
          ) : alerts.isError ? (
            <ErrorState onRetry={() => alerts.refetch()} />
          ) : alerts.data!.length === 0 ? (
            <EmptyState title="No alerts firing" hint="All monitors are within threshold." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {[...alerts.data!]
                .sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged))
                .slice(0, 4)
                .map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={a.severity} />
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        {new Date(a.triggeredAt).toISOString().slice(11, 16)} UTC
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{a.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Kpi({
  icon,
  label,
  value,
  detail,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "ok" | "warn";
}) {
  const toneClass =
    tone === "warn" ? "text-warn bg-warn/10" : tone === "ok" ? "text-ok bg-ok/10" : "text-primary bg-primary/10";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
