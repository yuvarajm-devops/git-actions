import { cn } from "@/lib/utils";
import type { ServerStatus } from "@/services/infra-api";

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  healthy: { dot: "bg-ok", text: "text-ok", bg: "bg-ok/10 border-ok/30", label: "Healthy" },
  running: { dot: "bg-primary", text: "text-primary", bg: "bg-primary/10 border-primary/30", label: "Running" },
  warning: { dot: "bg-warn", text: "text-warn", bg: "bg-warn/10 border-warn/30", label: "Warning" },
  degraded: { dot: "bg-warn", text: "text-warn", bg: "bg-warn/10 border-warn/30", label: "Degraded" },
  critical: { dot: "bg-crit", text: "text-crit", bg: "bg-crit/10 border-crit/30", label: "Critical" },
  failed: { dot: "bg-crit", text: "text-crit", bg: "bg-crit/10 border-crit/30", label: "Failed" },
  stopped: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40 border-border", label: "Stopped" },
  offline: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40 border-border", label: "Offline" },
  success: { dot: "bg-ok", text: "text-ok", bg: "bg-ok/10 border-ok/30", label: "Success" },
  rolled_back: { dot: "bg-warn", text: "text-warn", bg: "bg-warn/10 border-warn/30", label: "Rolled back" },
  skipped: { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40 border-border", label: "Skipped" },
  info: { dot: "bg-info", text: "text-info", bg: "bg-info/10 border-info/30", label: "Info" },
};

export function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES["info"]!;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = statusStyle(status);
  const live = status === "running";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("relative h-1.5 w-1.5 rounded-full", s.dot, live && "pulse-dot")} />
      {s.label}
    </span>
  );
}

export function HealthDot({ status }: { status: ServerStatus }) {
  const s = statusStyle(status);
  return <span className={cn("inline-block h-2 w-2 rounded-full", s.dot)} aria-label={s.label} />;
}

export function UsageBar({ value, label }: { value: number; label?: string }) {
  const tone = value >= 88 ? "bg-crit" : value >= 72 ? "bg-warn" : "bg-primary";
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
