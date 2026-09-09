// Deterministic mock infrastructure dataset for the DevOps dashboard demo.

export type ServerStatus = "healthy" | "warning" | "critical" | "offline";
export type Environment = "production" | "staging" | "development";

export interface Server {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  provider: "AWS" | "GCP" | "Azure" | "Bare metal";
  region: string;
  environment: Environment;
  status: ServerStatus;
  role: string;
  os: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptimeHours: number;
  cores: number;
  memoryTotalGb: number;
  diskTotalGb: number;
  services: { name: string; status: "running" | "degraded" | "stopped"; port: number }[];
  tags: string[];
}

export type DeployStatus = "success" | "failed" | "running" | "rolled_back";

export interface Deployment {
  id: string;
  service: string;
  version: string;
  commit: string;
  message: string;
  author: string;
  environment: Environment;
  status: DeployStatus;
  durationSec: number;
  startedAt: string;
  pipeline: { name: string; status: "success" | "failed" | "running" | "skipped"; sec: number }[];
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  source: string;
  serverId: string;
  message: string;
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  serverId: string;
  triggeredAt: string;
  acknowledged: boolean;
  metric: string;
  threshold: string;
}

export interface MetricPoint {
  t: string;
  cpu: number;
  memory: number;
  network: number;
  latency: number;
}

// Small seeded PRNG so charts and lists stay stable between renders.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const REGIONS = ["us-east-1", "us-west-2", "eu-central-1", "ap-south-1", "eu-west-3"];
const ROLES = [
  "API gateway",
  "Kubernetes worker",
  "Postgres primary",
  "Redis cache",
  "Kafka broker",
  "CI runner",
  "Object storage edge",
  "Ingress proxy",
];
const PROVIDERS: Server["provider"][] = ["AWS", "GCP", "Azure", "Bare metal"];

export const servers: Server[] = Array.from({ length: 14 }, (_, i) => {
  const rnd = seeded(1000 + i * 37);
  const env: Environment = i < 7 ? "production" : i < 11 ? "staging" : "development";
  const cpu = Math.round(18 + rnd() * 76);
  const memory = Math.round(24 + rnd() * 70);
  const disk = Math.round(30 + rnd() * 62);
  const offline = i === 9;
  const status: ServerStatus = offline
    ? "offline"
    : cpu > 88 || memory > 92
      ? "critical"
      : cpu > 72 || memory > 78 || disk > 85
        ? "warning"
        : "healthy";
  const role = ROLES[i % ROLES.length]!;
  return {
    id: `srv-${String(i + 1).padStart(3, "0")}`,
    name: `${role.split(" ")[0]!.toLowerCase()}-${env.slice(0, 4)}-${i + 1}`,
    hostname: `node-${i + 1}.${env}.internal`,
    ip: `10.${20 + (i % 4)}.${i + 3}.${12 + i}`,
    provider: PROVIDERS[i % PROVIDERS.length]!,
    region: REGIONS[i % REGIONS.length]!,
    environment: env,
    status,
    role,
    os: i % 3 === 0 ? "Ubuntu 24.04 LTS" : i % 3 === 1 ? "Debian 12" : "Amazon Linux 2023",
    cpu: offline ? 0 : cpu,
    memory: offline ? 0 : memory,
    disk,
    network: Math.round(rnd() * 940),
    uptimeHours: offline ? 0 : Math.round(30 + rnd() * 6800),
    cores: [4, 8, 16, 32][i % 4]!,
    memoryTotalGb: [16, 32, 64, 128][i % 4]!,
    diskTotalGb: [256, 512, 1024, 2048][i % 4]!,
    services: [
      { name: "nginx", status: offline ? "stopped" : "running", port: 443 },
      {
        name: i % 2 === 0 ? "node-exporter" : "otel-collector",
        status: offline ? "stopped" : status === "critical" ? "degraded" : "running",
        port: 9100,
      },
      { name: "containerd", status: offline ? "stopped" : "running", port: 10250 },
    ],
    tags: [env, role.split(" ")[0]!.toLowerCase(), REGIONS[i % REGIONS.length]!],
  };
});

export function metricSeries(serverId: string, points = 48): MetricPoint[] {
  const rnd = seeded(serverId.split("").reduce((a, c) => a + c.charCodeAt(0), 7));
  let cpu = 40 + rnd() * 25;
  let mem = 50 + rnd() * 20;
  return Array.from({ length: points }, (_, i) => {
    cpu = Math.min(99, Math.max(6, cpu + (rnd() - 0.5) * 16));
    mem = Math.min(98, Math.max(10, mem + (rnd() - 0.5) * 8));
    const hour = String(Math.floor((i * 30) / 60)).padStart(2, "0");
    const min = (i * 30) % 60 === 0 ? "00" : "30";
    return {
      t: `${hour}:${min}`,
      cpu: Math.round(cpu),
      memory: Math.round(mem),
      network: Math.round(120 + rnd() * 780),
      latency: Math.round(38 + rnd() * 190),
    };
  });
}

const SERVICES = [
  "checkout-api",
  "identity-service",
  "billing-worker",
  "web-storefront",
  "search-indexer",
  "notification-relay",
];
const AUTHORS = ["y.junior", "a.mehta", "l.novak", "s.okafor", "d.tran"];

export const deployments: Deployment[] = Array.from({ length: 18 }, (_, i): Deployment => {
  const rnd = seeded(500 + i * 91);
  const status: DeployStatus =
    i === 0 ? "running" : i === 3 ? "failed" : i === 7 ? "rolled_back" : rnd() > 0.18 ? "success" : "failed";
  const env: Environment = i % 3 === 0 ? "production" : i % 3 === 1 ? "staging" : "development";
  const started = new Date(Date.UTC(2026, 8, 9, 6, 20) - i * 1000 * 60 * 47);
  return {
    id: `dep-${2400 - i}`,
    service: SERVICES[i % SERVICES.length]!,
    version: `v${2 + (i % 3)}.${9 - (i % 7)}.${i % 5}`,
    commit: "",
    message: [
      "fix: retry idempotent payment captures",
      "chore: bump otel collector to 0.108",
      "feat: shard search index by tenant",
      "perf: cache session lookups in redis",
      "fix: correct HPA target utilisation",
      "feat: add readiness probe for worker pool",
    ][i % 6]!,
    author: AUTHORS[i % AUTHORS.length]!,
    environment: env,
    status,
    durationSec: Math.round(90 + rnd() * 520),
    startedAt: started.toISOString(),
    pipeline: [
      { name: "build", status: "success", sec: Math.round(40 + rnd() * 60) },
      { name: "unit tests", status: "success", sec: Math.round(60 + rnd() * 90) },
      {
        name: "integration",
        status: status === "failed" ? "failed" : status === "running" ? "running" : "success",
        sec: Math.round(80 + rnd() * 120),
      },
      {
        name: "deploy",
        status: status === "failed" ? "skipped" : status === "running" ? "running" : "success",
        sec: Math.round(50 + rnd() * 100),
      },
    ],
  };
}).map((d, i) => ({ ...d, commit: seededHash(`${d.id}${i}`) }));

function seededHash(input: string) {
  const rnd = seeded(input.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7) * 31, 13) % 4294967296);
  return Array.from({ length: 7 }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]!).join("");
}

const LOG_MESSAGES: Record<LogLevel, string[]> = {
  error: [
    "upstream connect error: connection timed out after 5000ms",
    "failed to acquire pg connection: pool exhausted (max=50)",
    "OOMKilled: container billing-worker exceeded memory limit",
    "TLS handshake failed for peer 10.22.4.19",
  ],
  warn: [
    "cpu throttling detected: 340ms of 1s period",
    "disk usage at 87% on /var/lib/containerd",
    "retrying kafka publish (attempt 3/5)",
    "slow query 2.4s: SELECT * FROM invoices WHERE tenant_id = $1",
  ],
  info: [
    "health check passed in 42ms",
    "rolling update completed: 6/6 pods ready",
    "scaled deployment checkout-api 4 -> 6 replicas",
    "certificate renewed, expires in 89 days",
  ],
  debug: [
    "cache hit ratio 0.94 over last 5m window",
    "trace span exported: 128 spans, 0 dropped",
    "reconcile loop finished, no drift detected",
    "heartbeat ack from control plane",
  ],
};

const LEVELS: LogLevel[] = ["info", "info", "debug", "warn", "info", "error", "warn", "info"];

export const logs: LogEntry[] = Array.from({ length: 160 }, (_, i) => {
  const rnd = seeded(7000 + i * 13);
  const level = LEVELS[i % LEVELS.length]!;
  const server = servers[i % servers.length]!;
  const ts = new Date(Date.UTC(2026, 8, 9, 6, 35) - i * 1000 * 23);
  return {
    id: `log-${i}`,
    ts: ts.toISOString(),
    level,
    source: server.services[Math.floor(rnd() * server.services.length)]!.name,
    serverId: server.id,
    message: LOG_MESSAGES[level][i % LOG_MESSAGES[level].length]!,
  };
});

export const alerts: AlertItem[] = [
  {
    id: "alt-901",
    severity: "critical",
    title: "Memory saturation on postgres primary",
    description: "Working set above 92% for 12 minutes; replication lag rising.",
    serverId: servers[2]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 9, 6, 12)).toISOString(),
    acknowledged: false,
    metric: "node_memory_used_percent",
    threshold: "> 90% for 10m",
  },
  {
    id: "alt-900",
    severity: "critical",
    title: "Host unreachable",
    description: "No scrape response from node-10.staging.internal for 4 consecutive intervals.",
    serverId: servers[9]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 9, 5, 48)).toISOString(),
    acknowledged: false,
    metric: "up",
    threshold: "== 0 for 2m",
  },
  {
    id: "alt-898",
    severity: "warning",
    title: "Disk pressure on containerd volume",
    description: "/var/lib/containerd at 87%; image GC has not reclaimed space.",
    serverId: servers[4]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 9, 4, 31)).toISOString(),
    acknowledged: true,
    metric: "node_filesystem_used_percent",
    threshold: "> 85%",
  },
  {
    id: "alt-895",
    severity: "warning",
    title: "p99 latency regression on checkout-api",
    description: "p99 climbed from 210ms to 486ms after deploy dep-2397.",
    serverId: servers[0]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 9, 3, 9)).toISOString(),
    acknowledged: false,
    metric: "http_request_duration_p99",
    threshold: "> 400ms for 5m",
  },
  {
    id: "alt-890",
    severity: "info",
    title: "Autoscaler added capacity",
    description: "Node group prod-workers scaled 6 -> 8 instances.",
    serverId: servers[1]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 9, 1, 55)).toISOString(),
    acknowledged: true,
    metric: "cluster_autoscaler_nodes",
    threshold: "change detected",
  },
  {
    id: "alt-884",
    severity: "warning",
    title: "Certificate expiring soon",
    description: "TLS cert for ingress.eu-central-1 expires in 11 days.",
    serverId: servers[7]!.id,
    triggeredAt: new Date(Date.UTC(2026, 8, 8, 22, 40)).toISOString(),
    acknowledged: false,
    metric: "cert_expiry_days",
    threshold: "< 14 days",
  },
];

export const clusterTraffic = Array.from({ length: 24 }, (_, i) => {
  const rnd = seeded(311 + i * 17);
  return {
    t: `${String(i).padStart(2, "0")}:00`,
    requests: Math.round(4200 + Math.sin(i / 3) * 1800 + rnd() * 900),
    errors: Math.round(12 + (i > 17 ? 60 : 0) * rnd() + rnd() * 30),
    p95: Math.round(120 + Math.sin(i / 4) * 45 + rnd() * 60),
  };
});
