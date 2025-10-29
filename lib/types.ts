export type RouteType = "rpc" | "jito" | "parallel";

export type LiveRoute = RouteType | "tpg" | "mock";

export type TransactionPhase =
  | "submitted"
  | "forwarded"
  | "landed"
  | "failed"
  | "refunded";

export type TransactionState = "pending" | "forwarded" | "landed" | "failed";

export interface TimelineEntry {
  phase: TransactionPhase;
  timestamp: number;
  slot?: number;
  latencyMs?: number;
  note?: string;
}

export interface TransactionRecord {
  signature: string;
  route: LiveRoute;
  routeUsed: LiveRoute;
  status: TransactionState;
  payer?: string;
  slot?: number;
  confirmTime?: number;
  refund?: boolean;
  tipLamports?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
  timeline: TimelineEntry[];
}

export interface TransactionStreamEvent {
  type: "transaction" | "metrics" | "benchmark" | "heartbeat";
  payload: unknown;
}

export interface MetricsSnapshot {
  successRate: number;
  refundRate: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  avgTipLamports: number | null;
  totalCount: number;
  failureCount: number;
  pendingCount: number;
  updatedAt: number;
}

export interface BuildTransactionRequest {
  txB64: string;
  options?: Record<string, unknown>;
}

export interface BuildTransactionResponse {
  txB64: string;
  latestBlockhash?: unknown;
}

export interface SendTransactionRequest {
  txB64: string;
  options?: { encoding?: "base64"; startSlot?: number };
}

export interface SendTransactionResponse {
  signature: string;
}

export interface TransactionStatusResponse {
  signature: string;
  status: TransactionState;
  slot?: number;
  confirmTime?: number;
  refund?: boolean;
  routeUsed?: LiveRoute;
  tipLamports?: number;
  error?: string;
}

export interface BenchmarkParameters {
  runs?: number;
  routes?: RouteType[];
  delayMs?: number;
}

export interface BenchmarkRouteStats {
  route: RouteType;
  successRate: number;
  failureRate: number;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  refundRate: number | null;
}

export interface BenchmarkResult {
  id: string;
  createdAt: number;
  cluster: string;
  routes: RouteType[];
  runs: number;
  stats: BenchmarkRouteStats[];
  csv?: string;
}
