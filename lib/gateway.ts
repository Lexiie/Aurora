import { randomUUID } from "node:crypto";
import {
  BuildTransactionRequest,
  BuildTransactionResponse,
  SendTransactionRequest,
  SendTransactionResponse,
  TransactionStatusResponse,
  RouteType
} from "./types";
import {
  SANCTUM_BASE_URL,
  SANCTUM_API_KEY,
  DEFAULT_JITO_TIP_LAMPORTS,
  MOCK_GATEWAY
} from "./env";

interface MockTrackedTx {
  signature: string;
  route: RouteType;
  routeUsed: RouteType;
  slot: number;
  tipLamports: number;
  startedAt: number;
  steps: Array<{
    state: TransactionStatusResponse["status"];
    at: number;
    refund?: boolean;
    error?: string;
  }>;
}

class MockGateway {
  private readonly transactions = new Map<string, MockTrackedTx>();

  async buildTransaction(_payload: BuildTransactionRequest): Promise<BuildTransactionResponse> {
    return {
      txB64: Buffer.from(`mock-tx-${Math.random().toString(36).slice(2)}`).toString("base64"),
      lastValidBlockHeight: Math.floor(Math.random() * 1_000_000)
    };
  }

  async sendTransaction(payload: SendTransactionRequest): Promise<SendTransactionResponse> {
    const signature = `mock-${randomUUID()}`;
    const now = Date.now();
    const shouldFail = Math.random() < 0.1;
    const shouldRefund = !shouldFail && Math.random() < 0.25 && payload.route !== "rpc";

    const routeUsed: RouteType =
      payload.route === "parallel"
        ? (Math.random() > 0.5 ? "jito" : "rpc")
        : payload.route;

    const finalState: TransactionStatusResponse["status"] = shouldFail ? "failed" : "landed";

    const steps: MockTrackedTx["steps"] = [
      {
        state: "forwarded",
        at: now + 200 + Math.floor(Math.random() * 400)
      },
      {
        state: finalState,
        at: now + 1_100 + Math.floor(Math.random() * 1_200),
        refund: shouldRefund,
        error: shouldFail ? "Transaction simulation failed" : undefined
      }
    ];

    this.transactions.set(signature, {
      signature,
      route: payload.route,
      routeUsed,
      slot: Math.floor(Math.random() * 200_000),
      tipLamports: payload.jitoTipLamports ?? DEFAULT_JITO_TIP_LAMPORTS,
      startedAt: now,
      steps
    });

    return {
      signature,
      routeUsed
    };
  }

  async getTransactionStatus(signature: string): Promise<TransactionStatusResponse | undefined> {
    const tracked = this.transactions.get(signature);
    if (!tracked) {
      return undefined;
    }

    const now = Date.now();
    let currentState: TransactionStatusResponse["status"] = "pending";
    let refund = false;
    let error: string | undefined;
    let confirmTime: number | undefined;

    for (const step of tracked.steps) {
      if (now >= step.at) {
        currentState = step.state;
        confirmTime = step.at;
        refund = Boolean(step.refund);
        error = step.error;
      }
    }

    return {
      signature,
      status: currentState,
      slot: tracked.slot,
      confirmTime,
      refund,
      tipLamports: tracked.tipLamports,
      routeUsed: tracked.routeUsed,
      error
    };
  }
}

const mockGateway = new MockGateway();

const postJson = async <TResponse>(path: string, body: unknown): Promise<TResponse> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (SANCTUM_API_KEY) {
    headers["x-api-key"] = SANCTUM_API_KEY;
  }

  const response = await fetch(`${SANCTUM_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Sanctum Gateway error (${response.status}): ${message}`);
  }

  return (await response.json()) as TResponse;
};

export const buildTransaction = async (
  payload: BuildTransactionRequest
): Promise<BuildTransactionResponse> => {
  if (MOCK_GATEWAY) {
    return mockGateway.buildTransaction(payload);
  }

  return postJson<BuildTransactionResponse>("/v1/tx/build", payload);
};

export const sendTransaction = async (
  payload: SendTransactionRequest
): Promise<SendTransactionResponse> => {
  if (MOCK_GATEWAY) {
    return mockGateway.sendTransaction(payload);
  }

  const routePath = `/v1/tx/send/${payload.route}`;
  return postJson<SendTransactionResponse>(routePath, payload);
};

export const getTransactionStatus = async (
  signature: string
): Promise<TransactionStatusResponse | undefined> => {
  if (MOCK_GATEWAY) {
    return mockGateway.getTransactionStatus(signature);
  }

  return postJson<TransactionStatusResponse>("/v1/tx/status", { signature });
};
