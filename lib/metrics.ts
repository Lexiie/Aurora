import { MetricsSnapshot, TransactionRecord } from "./types";

const percentile = (values: number[], percentileValue: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

export class MetricsAggregator {
  private readonly store = new Map<string, TransactionRecord>();

  upsert(record: TransactionRecord) {
    this.store.set(record.signature, record);
  }

  snapshot(): MetricsSnapshot {
    const transactions = Array.from(this.store.values());
    const completed = transactions.filter((tx) => tx.status === "landed" || tx.status === "failed");
    const successes = completed.filter((tx) => tx.status === "landed");
    const latencies = completed
      .map((tx) => (tx.confirmTime ? tx.confirmTime - tx.createdAt : undefined))
      .filter((value): value is number => typeof value === "number" && value > 0);

    const avgTipLamportsValues = completed
      .map((tx) => tx.tipLamports)
      .filter((value): value is number => typeof value === "number" && value >= 0);

    const refundCount = completed.filter((tx) => Boolean(tx.refund)).length;

    const successRate = completed.length === 0 ? 0 : (successes.length / completed.length) * 100;
    const refundRate = completed.length === 0 ? 0 : (refundCount / completed.length) * 100;

    const avgTipLamports =
      avgTipLamportsValues.length === 0
        ? null
        : Math.round(avgTipLamportsValues.reduce((sum, value) => sum + value, 0) / avgTipLamportsValues.length);

    const snapshot: MetricsSnapshot = {
      successRate: Number(successRate.toFixed(2)),
      refundRate: Number(refundRate.toFixed(2)),
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
      avgTipLamports,
      totalCount: transactions.length,
      failureCount: transactions.filter((tx) => tx.status === "failed").length,
      pendingCount: transactions.filter((tx) => tx.status === "pending" || tx.status === "forwarded").length,
      updatedAt: Date.now()
    };

    return snapshot;
  }
}

export const metricsAggregator = new MetricsAggregator();
