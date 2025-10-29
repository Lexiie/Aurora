"use client";

import type { MetricsSnapshot } from "@/lib/types";
import { formatLatency, formatTip } from "@/lib/format";
import { KpiCard } from "./KpiCard";

interface KpiGridProps {
  metrics: MetricsSnapshot | null;
}

const formatRate = (value?: number) =>
  typeof value === "number" ? `${value.toFixed(2)}%` : "—";

export function KpiGrid({ metrics }: KpiGridProps) {
  const successRate = formatRate(metrics?.successRate);
  const refundRate = formatRate(metrics?.refundRate);
  const p50Latency = formatLatency(metrics?.p50LatencyMs);
  const p95Latency = formatLatency(metrics?.p95LatencyMs);
  const avgTip = formatTip(metrics?.avgTipLamports);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Success Rate" value={successRate} subtitle={`${metrics?.totalCount ?? 0} tracked`} emphasis="success" />
      <KpiCard title="Refund Rate" value={refundRate} subtitle="Parallel & Jito routes" emphasis="warning" />
      <KpiCard title="p50 Latency" value={p50Latency} subtitle="Confirmation" />
      <KpiCard title="p95 Latency" value={p95Latency} subtitle="Confirmation tail" />
      <KpiCard title="Avg Jito Tip" value={avgTip} subtitle="Spent per landed tx" />
    </div>
  );
}
