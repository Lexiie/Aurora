"use client";

import type { MetricsSnapshot } from "@/lib/types";
import { formatLatency, formatTip } from "@/lib/format";
import { KpiCard } from "./KpiCard";

interface KpiGridProps {
  metrics: MetricsSnapshot | null;
}

const formatRate = (value?: number | null) =>
  typeof value === "number" ? `${value.toFixed(2)}%` : "—";

export function KpiGrid({ metrics }: KpiGridProps) {
  const successRate = formatRate(metrics?.successRate);
  const hasRefundSignals = metrics?.refundRate !== undefined && metrics?.refundRate !== null;
  const refundRate = formatRate(hasRefundSignals ? metrics?.refundRate : null);
  const p50Latency = formatLatency(metrics?.p50LatencyMs);
  const p95Latency = formatLatency(metrics?.p95LatencyMs);
  const avgTip = formatTip(metrics?.avgTipLamports);

  const refundSubtitle = hasRefundSignals ? "Based on available signals" : "Public refund feed pending";
  const tipSubtitle = avgTip === "—" ? "Captured when reported" : "Spent per landed tx";

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard title="Success Rate" value={successRate} subtitle={`${metrics?.totalCount ?? 0} tracked`} emphasis="success" />
      <KpiCard title="Refund Insight" value={refundRate} subtitle={refundSubtitle} emphasis="warning" />
      <KpiCard title="p50 Latency" value={p50Latency} subtitle="Confirmation" />
      <KpiCard title="p95 Latency" value={p95Latency} subtitle="Confirmation tail" />
      <KpiCard title="Avg Tip" value={avgTip} subtitle={tipSubtitle} />
    </div>
  );
}
