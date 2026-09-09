import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BellOff, Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, LiveClockBadge } from "@/components/infra/app-shell";
import { EmptyState, ErrorState, LoadingBlock, Panel } from "@/components/infra/states";
import { StatusBadge } from "@/components/infra/status";
import { cn } from "@/lib/utils";
import { acknowledgeAlert, getAlerts, getServers, type AlertItem } from "@/services/infra-api";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — NodeWatch alert center" },
      {
        name: "description",
        content: "Firing monitors with severity, threshold, affected host and one-click acknowledgement.",
      },
      { property: "og:title", content: "Alerts — NodeWatch alert center" },
      {
        property: "og:description",
        content: "Triage infrastructure alerts and acknowledge them without leaving the dashboard.",
      },
    ],
  }),
  component: AlertsPage,
});

const TABS = ["open", "acknowledged", "all"] as const;

function AlertsPage() {
  const qc = useQueryClient();
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const servers = useQuery({ queryKey: ["servers"], queryFn: getServers });
  const [tab, setTab] = useState<(typeof TABS)[number]>("open");

  const ack = useMutation({
    mutationFn: acknowledgeAlert,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["alerts"] });
      const prev = qc.getQueryData<AlertItem[]>(["alerts"]);
      qc.setQueryData<AlertItem[]>(["alerts"], (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["alerts"], ctx.prev);
      toast.error("Could not acknowledge alert");
    },
    onSuccess: () => toast.success("Alert acknowledged"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["summary"] }),
  });

  const list = useMemo(() => {
    const data = alerts.data ?? [];
    if (tab === "open") return data.filter((a) => !a.acknowledged);
    if (tab === "acknowledged") return data.filter((a) => a.acknowledged);
    return data;
  }, [alerts.data, tab]);

  const hostName = (id: string) => servers.data?.find((s) => s.id === id)?.name ?? id;

  return (
    <AppShell
      title="Alert center"
      description="Monitors currently breaching their thresholds"
      actions={<LiveClockBadge />}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["critical", "warning", "info"] as const).map((sev) => (
            <div key={sev} className="rounded-lg border border-border bg-card p-4">
              <StatusBadge status={sev} />
              <p className="mt-3 font-display text-2xl font-semibold">
                {(alerts.data ?? []).filter((a) => a.severity === sev && !a.acknowledged).length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">unacknowledged</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[11px] uppercase transition-colors",
                tab === t
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border bg-panel text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <Panel title="Alerts" subtitle={`${list.length} shown`}>
          {alerts.isPending ? (
            <LoadingBlock rows={5} />
          ) : alerts.isError ? (
            <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              title={tab === "open" ? "Nothing is firing" : "No alerts here"}
              hint="Monitors are inside their configured thresholds."
            />
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "rounded-md border bg-panel p-4",
                    a.acknowledged ? "border-border opacity-70" : "border-border",
                    !a.acknowledged && a.severity === "critical" && "border-crit/40",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={a.severity} />
                    <p className="flex-1 text-sm font-medium">{a.title}</p>
                    {a.acknowledged ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <BellOff className="h-3 w-3" /> acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => ack.mutate(a.id)}
                        disabled={ack.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                      >
                        {ack.isPending && ack.variables === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Acknowledge
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{a.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <Link
                      to="/server/$id"
                      params={{ id: a.serverId }}
                      className="text-primary hover:underline"
                    >
                      {hostName(a.serverId)}
                    </Link>
                    <span>{a.metric}</span>
                    <span>threshold {a.threshold}</span>
                    <span>{a.triggeredAt.slice(5, 16).replace("T", " ")} UTC</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
