import { randomUUID } from "node:crypto";
import {
  BuildTransactionRequest,
  BuildTransactionResponse,
  SendTransactionRequest,
  SendTransactionResponse,
  TransactionStatusResponse,
  LiveRoute
} from "./types";
import {
  SANCTUM_API_KEY,
  DEFAULT_JITO_TIP_LAMPORTS,
  MOCK_GATEWAY,
  AURORA_CLUSTER,
  SOLANA_RPC_URL,
  TPG_BASE_URL
} from "./env";

interface MockTrackedTx {
  signature: string;
  routeUsed: LiveRoute;
  slot: number;
  tipLamports?: number;
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
      latestBlockhash: {
        blockhash: `mock-${Math.random().toString(36).slice(2, 10)}`,
        lastValidBlockHeight: Math.floor(Math.random() * 1_000_000)
      }
    };
  }

  async sendTransaction(_payload: SendTransactionRequest): Promise<SendTransactionResponse> {
    const signature = `mock-${randomUUID()}`;
    const now = Date.now();
    const shouldFail = Math.random() < 0.1;
    const shouldRefund = !shouldFail && Math.random() < 0.1;

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
      routeUsed: "mock",
      slot: Math.floor(Math.random() * 200_000),
      tipLamports: DEFAULT_JITO_TIP_LAMPORTS,
      startedAt: now,
      steps
    });

    return { signature };
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

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcEnvelope<T> {
  result?: T;
  error?: JsonRpcError;
}

export const tpgPost = async <T>(method: string, params: unknown[]): Promise<T> => {
  const apiKey = SANCTUM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SANCTUM_API_KEY for TPG request");
  }

  const url = `${TPG_BASE_URL}/${AURORA_CLUSTER}?apiKey=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      id: "aurora",
      jsonrpc: "2.0",
      method,
      params
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`TPG ${method} failed (${response.status}): ${message}`);
  }

  const envelope = (await response.json()) as JsonRpcEnvelope<T>;
  if (envelope.error) {
    throw new Error(`TPG ${method} error: ${envelope.error.message}`);
  }
  if (envelope.result === undefined) {
    throw new Error(`TPG ${method} returned empty result`);
  }

  return envelope.result;
};

export const buildTransaction = async (
  payload: BuildTransactionRequest
): Promise<BuildTransactionResponse> => {
  if (MOCK_GATEWAY) {
    return mockGateway.buildTransaction(payload);
  }

  const result = await tpgPost<{ transaction: string; latestBlockhash?: unknown }>(
    "buildGatewayTransaction",
    [payload.txB64, payload.options ?? {}]
  );

  return {
    txB64: result.transaction,
    latestBlockhash: result.latestBlockhash
  };
};

export const sendTransaction = async (
  payload: SendTransactionRequest
): Promise<SendTransactionResponse> => {
  if (MOCK_GATEWAY) {
    return mockGateway.sendTransaction(payload);
  }

  const params: unknown[] = payload.options ? [payload.txB64, payload.options] : [payload.txB64];
  const signature = await tpgPost<string>("sendTransaction", params);

  return { signature };
};

const normalizeRpcError = (err: unknown): string | undefined => {
  if (!err) {
    return undefined;
  }
  if (typeof err === "string") {
    return err;
  }
  try {
    return JSON.stringify(err);
  } catch (serializationError) {
    return "Unknown error";
  }
};

const fetchSignatureStatus = async (signature: string): Promise<TransactionStatusResponse> => {
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `aurora-status-${signature}`,
      method: "getSignatureStatuses",
      params: [[signature], { searchTransactionHistory: true }]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`getSignatureStatuses failed (${response.status}): ${message}`);
  }

  const payload = await response.json();
  const statusInfo = payload?.result?.value?.[0];
  const slot: number | undefined = statusInfo?.slot ?? undefined;
  const now = Date.now();

  if (!statusInfo) {
    return { signature, status: "pending", routeUsed: "tpg" };
  }

  if (statusInfo.err) {
    return {
      signature,
      status: "failed",
      slot,
      confirmTime: now,
      error: normalizeRpcError(statusInfo.err),
      routeUsed: "tpg"
    };
  }

  if (statusInfo.confirmationStatus) {
    return {
      signature,
      status: "landed",
      slot,
      confirmTime: now,
      routeUsed: "tpg"
    };
  }

  return {
    signature,
    status: "pending",
    slot,
    routeUsed: "tpg"
  };
};

export const getTransactionStatus = async (
  signature: string
): Promise<TransactionStatusResponse | undefined> => {
  if (MOCK_GATEWAY) {
    return mockGateway.getTransactionStatus(signature);
  }

  return fetchSignatureStatus(signature);
};
