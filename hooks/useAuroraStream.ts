"use client";

/**
 * Client-side hook that maintains an EventSource connection to the SSE stream.
 * Handles auto reconnects and state aggregation so components receive derived data.
 */
import { useEffect, useMemo, useReducer } from "react";
import type { MetricsSnapshot, TransactionRecord } from "@/lib/types";

interface StreamState {
  transactions: TransactionRecord[];
  metrics: MetricsSnapshot | null;
  connected: boolean;
  lastHeartbeat?: number;
  error?: string;
}

const initialState: StreamState = {
  transactions: [],
  metrics: null,
  connected: false
};

const MAX_TRANSACTIONS = 200;

interface InitEvent {
  transactions?: TransactionRecord[];
  metrics?: MetricsSnapshot;
}

type StreamAction =
  | { type: "INIT"; payload: InitEvent }
  | { type: "TRANSACTION"; payload: TransactionRecord }
  | { type: "METRICS"; payload: MetricsSnapshot }
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED"; payload?: string }
  | { type: "HEARTBEAT"; payload: number };

const sortTransactions = (transactions: TransactionRecord[]) =>
  [...transactions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_TRANSACTIONS);

const reducer = (state: StreamState, action: StreamAction): StreamState => {
  switch (action.type) {
    case "INIT": {
      return {
        transactions: sortTransactions(action.payload.transactions ?? []),
        metrics: action.payload.metrics ?? state.metrics,
        connected: true,
        error: undefined,
        lastHeartbeat: Date.now()
      };
    }
    case "TRANSACTION": {
      const existingIndex = state.transactions.findIndex((tx) => tx.signature === action.payload.signature);
      const nextTransactions = [...state.transactions];
      if (existingIndex >= 0) {
        nextTransactions[existingIndex] = action.payload;
      } else {
        nextTransactions.unshift(action.payload);
      }
      return {
        ...state,
        transactions: sortTransactions(nextTransactions)
      };
    }
    case "METRICS": {
      return {
        ...state,
        metrics: action.payload
      };
    }
    case "CONNECTED": {
      return {
        ...state,
        connected: true,
        error: undefined
      };
    }
    case "DISCONNECTED": {
      return {
        ...state,
        connected: false,
        error: action.payload ?? "Connection lost"
      };
    }
    case "HEARTBEAT": {
      return {
        ...state,
        lastHeartbeat: action.payload
      };
    }
    default:
      return state;
  }
};

/**
 * Subscribes to /api/stream and exposes the latest transactions + metrics.
 * @returns Live transaction list, metrics snapshot, and connection diagnostics.
 */
export function useAuroraStream() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Establish SSE connection to the Node runtime stream; server may recycle after ~60s.
    const source = new EventSource("/api/stream");

    source.onopen = () => {
      // Reset error state whenever the EventSource is successfully reopened.
      dispatch({ type: "CONNECTED" });
    };

    source.onerror = () => {
      // Mark disconnected so UI can surface toast/banners while browser retries.
      dispatch({ type: "DISCONNECTED", payload: "Stream disconnected" });
    };

    const handleInit = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as InitEvent;
        dispatch({ type: "INIT", payload: data });
      } catch (error) {
        console.warn("Failed to parse init payload", error);
      }
    };

    const handleTransaction = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as TransactionRecord;
        dispatch({ type: "TRANSACTION", payload: data });
      } catch (error) {
        console.warn("Failed to parse transaction payload", error);
      }
    };

    const handleMetrics = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as MetricsSnapshot;
        dispatch({ type: "METRICS", payload: data });
      } catch (error) {
        console.warn("Failed to parse metrics payload", error);
      }
    };

    const handleHeartbeat = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { ts: number };
        dispatch({ type: "HEARTBEAT", payload: data.ts }); // Keep track of heartbeats for diagnostics.
      } catch (error) {
        console.warn("Failed to parse heartbeat payload", error);
      }
    };

    source.addEventListener("init", handleInit);
    source.addEventListener("transaction", handleTransaction);
    source.addEventListener("metrics", handleMetrics);
    source.addEventListener("heartbeat", handleHeartbeat);

    return () => {
      source.removeEventListener("init", handleInit);
      source.removeEventListener("transaction", handleTransaction);
      source.removeEventListener("metrics", handleMetrics);
      source.removeEventListener("heartbeat", handleHeartbeat);
      source.close();
    };
  }, []);

  // Memoise connection diagnostics so components avoid unnecessary re-renders.
  const connectionState = useMemo(
    () => ({
      connected: state.connected,
      error: state.error,
      lastHeartbeat: state.lastHeartbeat
    }),
    [state.connected, state.error, state.lastHeartbeat]
  );

  return {
    transactions: state.transactions,
    metrics: state.metrics,
    connectionState
  };
}
