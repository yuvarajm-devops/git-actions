/**
 * API service layer.
 *
 * Every screen talks to the app through these functions only, so swapping the
 * mock dataset for real HTTP calls later means editing this file alone.
 */
import {
  alerts as alertsData,
  clusterTraffic,
  deployments as deploymentsData,
  logs as logsData,
  metricSeries,
  servers as serversData,
  type AlertItem,
  type Deployment,
  type Environment,
  type LogEntry,
  type LogLevel,
  type MetricPoint,
  type Server,
  type ServerStatus,
} from "@/lib/mock-data";

export type {
  AlertItem,
  Deployment,
  Environment,
  LogEntry,
  LogLevel,
  MetricPoint,
  Server,
  ServerStatus,
};

const LATENCY = 420;

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ClusterSummary {
  totalServers: number;
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  avgCpu: number;
  avgMemory: number;
  requestsPerMin: number;
  errorRate: number;
  openAlerts: number;
  deploysToday: number;
  successRate: number;
  uptime: number;
}

export async function getClusterSummary(): Promise<ClusterSummary> {
  const online = serversData.filter((s) => s.status !== "offline");
  const total = clusterTraffic.reduce((a, p) => a + p.requests, 0);
  const errs = clusterTraffic.reduce((a, p) => a + p.errors, 0);
  const finished = deploymentsData.filter((d) => d.status !== "running");
  return delay({
    totalServers: serversData.length,
    healthy: serversData.filter((s) => s.status === "healthy").length,
    warning: serversData.filter((s) => s.status === "warning").length,
    critical: serversData.filter((s) => s.status === "critical").length,
    offline: serversData.filter((s) => s.status === "offline").length,
    avgCpu: Math.round(online.reduce((a, s) => a + s.cpu, 0) / online.length),
    avgMemory: Math.round(online.reduce((a, s) => a + s.memory, 0) / online.length),
    requestsPerMin: Math.round(total / 24 / 60),
    errorRate: Number(((errs / total) * 100).toFixed(2)),
    openAlerts: alertsData.filter((a) => !a.acknowledged).length,
    deploysToday: deploymentsData.length,
    successRate: Math.round(
      (finished.filter((d) => d.status === "success").length / finished.length) * 100,
    ),
    uptime: 99.98,
  });
}

export async function getTrafficSeries() {
  return delay(clusterTraffic);
}

export async function getServers(): Promise<Server[]> {
  return delay(serversData);
}

export async function getServer(id: string): Promise<Server> {
  const found = serversData.find((s) => s.id === id);
  if (!found) throw new Error(`Server ${id} not found`);
  return delay(found);
}

export async function getServerMetrics(id: string): Promise<MetricPoint[]> {
  return delay(metricSeries(id));
}

export async function getDeployments(): Promise<Deployment[]> {
  return delay(deploymentsData);
}

export async function getLogs(): Promise<LogEntry[]> {
  return delay(logsData);
}

export async function getAlerts(): Promise<AlertItem[]> {
  return delay(alertsData);
}

/** Optimistic-friendly mock mutation: acknowledges an alert. */
export async function acknowledgeAlert(id: string): Promise<AlertItem> {
  const alert = alertsData.find((a) => a.id === id);
  if (!alert) throw new Error(`Alert ${id} not found`);
  alert.acknowledged = true;
  return delay(alert, 250);
}

/** Mock action used by the server detail page (restart service). */
export async function restartService(serverId: string, service: string): Promise<{ ok: true }> {
  await delay(null, 900);
  if (!serversData.some((s) => s.id === serverId)) throw new Error("Unknown server");
  void service;
  return { ok: true };
}
