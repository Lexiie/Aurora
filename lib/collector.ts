/**
 * In-memory transaction collector that streams updates to the dashboard.
 * Polls Solana RPC for signature statuses while enforcing concurrency and rate limits.
 */
import EventEmitter from "node:events";
import { metricsAggregator } from "./metrics";
import {
  MetricsSnapshot,
  LiveRoute,
  TimelineEntry,
  TransactionRecord,
  TransactionStatusResponse,
  TransactionStreamEvent
} from "./types";
import { getTransactionStatus } from "./gateway";

const MAX_CONCURRENT_TRACKERS = 10; // Caps concurrent status polls to avoid exhausting runtime limits.
const POLL_INTERVAL_MS = 800; // Respect Solana RPC rate limits by waiting ≥800ms between polls per signature.
const EVENT_CHANNEL = "broadcast";

const terminalStates = new Set<TransactionRecord["status"]>(["failed", "landed"]);

const ensureTimelineEntry = (timeline: TimelineEntry[], entry: TimelineEntry): TimelineEntry[] => {
  const alreadyExists = timeline.some((item) => item.phase === entry.phase);
  if (alreadyExists) {
    return timeline;
  }
  return [...timeline, entry];
};

const mapStatusToPhase: Record<TransactionRecord["status"], TimelineEntry["phase"]> = {
  pending: "submitted",
  forwarded: "forwarded",
  landed: "landed",
  failed: "failed"
};

const deriveStatusFromResponse = (response: TransactionStatusResponse, current: TransactionRecord): TransactionRecord => {
  const status = response.status ?? current.status;
  const now = Date.now();

  let updatedTimeline = ensureTimelineEntry(current.timeline, {
    phase: mapStatusToPhase[status],
    timestamp: response.confirmTime ?? now,
    slot: response.slot,
    latencyMs: response.confirmTime ? response.confirmTime - current.createdAt : undefined
  });

  if (response.refund) {
    updatedTimeline = ensureTimelineEntry(updatedTimeline, {
      phase: "refunded",
      timestamp: now,
      slot: response.slot
    });
  }

  const record: TransactionRecord = {
    ...current,
    status,
    slot: response.slot ?? current.slot,
    confirmTime: response.confirmTime ?? current.confirmTime ?? (terminalStates.has(status) ? now : undefined),
    refund: response.refund ?? current.refund,
    tipLamports: response.tipLamports ?? current.tipLamports,
    routeUsed: response.routeUsed ?? current.routeUsed,
    error: response.error ?? current.error,
    updatedAt: now,
    timeline: updatedTimeline
  };

  return record;
};

/**
 * Tracks transaction lifecycles and emits events for SSE consumers.
 * Polling is centralised here so API routes and UI stay lean.
 */
export class TransactionCollector extends EventEmitter {
  private readonly transactions = new Map<string, TransactionRecord>();
  private readonly pollers = new Map<string, NodeJS.Timeout>();
  private readonly pendingQueue: string[] = [];

  constructor() {
    super();
    this.setMaxListeners(0);
  }

  /**
   * Seeds tracking for a freshly submitted transaction.
   * @param signature Solana signature returned from TPG.
   * @param route Route that initiated the transaction (mock or tpg).
   * @param payer Optional payer reference for UI context.
   * @param tipLamports Optional tip metadata (mock only).
   * @returns Newly created transaction record.
   */
  createRecord(signature: string, route: LiveRoute, payer?: string, tipLamports?: number): TransactionRecord {
    const now = Date.now();
    const record: TransactionRecord = {
      signature,
      route,
      routeUsed: route,
      status: "pending",
      payer,
      tipLamports,
      createdAt: now,
      updatedAt: now,
      timeline: [
        {
          phase: "submitted",
          timestamp: now
        }
      ]
    };

    this.transactions.set(signature, record);
    metricsAggregator.upsert(record);
    this.emitEvent({ type: "transaction", payload: record });
    this.emitMetrics();

    this.ensureTracker(signature);

    return record;
  }

  /**
   * Marks a transaction as forwarded once TPG acknowledges the submission.
   * @param signature Transaction signature to update.
   * @param routeUsed Actual route used when forwarding (mock or tpg).
   */
  markForwarded(signature: string, routeUsed: LiveRoute) {
    const record = this.transactions.get(signature);
    if (!record) {
      return;
    }

    const now = Date.now();
    const updated: TransactionRecord = {
      ...record,
      status: "forwarded",
      routeUsed,
      updatedAt: now,
      timeline: ensureTimelineEntry(record.timeline, {
        phase: "forwarded",
        timestamp: now
      })
    };

    this.upsert(updated);
  }

  /**
   * Persists a transaction update, emits SSE events, and keeps metrics fresh.
   * @param record Updated transaction descriptor.
   */
  upsert(record: TransactionRecord) {
    this.transactions.set(record.signature, record);
    metricsAggregator.upsert(record);
    this.emitEvent({ type: "transaction", payload: record });
    this.emitMetrics();

    if (!terminalStates.has(record.status)) {
      this.ensureTracker(record.signature);
    }
  }

  get(signature: string): TransactionRecord | undefined {
    return this.transactions.get(signature);
  }

  all(limit = 200): TransactionRecord[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  metrics(): MetricsSnapshot {
    return metricsAggregator.snapshot();
  }

  private emitMetrics() {
    this.emitEvent({ type: "metrics", payload: metricsAggregator.snapshot() });
  }

  private emitEvent(event: TransactionStreamEvent) {
    this.emit(EVENT_CHANNEL, event);
  }

  /**
   * Subscribes to collector events (transaction + metrics) for SSE broadcasting.
   * @returns Cleanup function to remove the listener.
   */
  subscribe(listener: (event: TransactionStreamEvent) => void) {
    this.on(EVENT_CHANNEL, listener);
    return () => {
      this.off(EVENT_CHANNEL, listener);
    };
  }

  /**
   * Ensures a poller exists for the provided signature, respecting concurrency caps.
   */
  private ensureTracker(signature: string) {
    if (this.pollers.has(signature)) {
      return;
    }

    if (this.pollers.size >= MAX_CONCURRENT_TRACKERS) {
      if (!this.pendingQueue.includes(signature)) {
        this.pendingQueue.push(signature);
      }
      return;
    }

    this.startPolling(signature);
  }

  /**
   * Spins up a polling loop for the signature and stops once it reaches a terminal state.
   */
  private startPolling(signature: string) {
    const record = this.transactions.get(signature);
    if (!record || terminalStates.has(record.status)) {
      return;
    }

    let polling = false;

    const poll = async () => {
      if (polling) {
        return;
      }
      polling = true; // Skip overlapping polls to avoid double RPC requests.
      try {
        const response = await getTransactionStatus(signature);
        if (!response) {
          return;
        }

        const current = this.transactions.get(signature);
        if (!current) {
          return;
        }

        const updatedRecord = deriveStatusFromResponse(response, current);
        this.transactions.set(signature, updatedRecord);
        metricsAggregator.upsert(updatedRecord);
        this.emitEvent({ type: "transaction", payload: updatedRecord });
        this.emitMetrics();

        if (terminalStates.has(updatedRecord.status)) {
          this.stopPolling(signature);
        }
      } catch (error) {
        console.warn("Polling failed", error);
      } finally {
        polling = false;
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    this.pollers.set(signature, interval);
    void poll(); // Kick off immediately so the UI gets a fresh status without waiting one interval.
  }

  /**
   * Cleans up the interval for a completed signature and schedules the next queued item.
   */
  private stopPolling(signature: string) {
    const interval = this.pollers.get(signature);
    if (interval) {
      clearInterval(interval);
      this.pollers.delete(signature);
    }

    const nextSignature = this.pendingQueue.shift();
    if (nextSignature) {
      this.ensureTracker(nextSignature);
    }
  }
}

export const transactionCollector = new TransactionCollector();
