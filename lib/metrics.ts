/**
 * Aggregates live transaction metrics (success rate, latency percentiles, refund insight).
 * Consumes records from the collector and exposes snapshots for API routes/UI.
 */
import { MetricsSnapshot, TransactionRecord } from "./types";

/**
 * Calculates the percentile (p50, p95) for latency arrays.
 * Returns null when there are no data points.
 */
const percentile = (values: number[], percentileValue: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

/**
 * Mutable in-memory metrics store; callers upsert transactions and request snapshots.
 */
export class MetricsAggregator {
  private readonly store = new Map<string, TransactionRecord>();

  /**
   * Records or updates a transaction within the aggregator.
   * @param record Transaction data to merge.
   */
  upsert(record: TransactionRecord) {
    this.store.set(record.signature, record);
  }

  /**
   * Derives the latest metrics snapshot (only landed/failed are counted for percentiles).
   * @returns Comprehensive snapshot consumed by dashboards and API routes.
   */
  snapshot(): MetricsSnapshot {
    const transactions = Array.from(this.store.values());
    const completed = transactions.filter((tx) => tx.status === "landed" || tx.status === "failed");
    const successes = completed.filter((tx) => tx.status === "landed");
    const latencies = completed
      .map((tx) => (tx.confirmTime ? tx.confirmTime - tx.createdAt : undefined))
      .filter((value): value is number => typeof value === "number" && value > 0); // Only landed/failed provide meaningful confirmation deltas.

    const avgTipLamportsValues = completed
      .map((tx) => tx.tipLamports)
      .filter((value): value is number => typeof value === "number" && value >= 0);

    const refundSignals = completed.filter((tx) => tx.refund !== undefined);
    const refunded = refundSignals.filter((tx) => Boolean(tx.refund)).length;

    const successRate = completed.length === 0 ? 0 : (successes.length / completed.length) * 100;
    const refundRate =
      refundSignals.length === 0 ? null : Number(((refunded / refundSignals.length) * 100).toFixed(2));

    const avgTipLamports =
      avgTipLamportsValues.length === 0
        ? null
        : Math.round(avgTipLamportsValues.reduce((sum, value) => sum + value, 0) / avgTipLamportsValues.length);

    const snapshot: MetricsSnapshot = {
      successRate: Number(successRate.toFixed(2)),
      refundRate,
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
