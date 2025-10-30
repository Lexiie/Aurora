/**
 * Streams collector updates to clients using Server-Sent Events (SSE).
 * Runs on the Node runtime so the response can stay open and bypass edge buffering.
 * The stream is entirely server-driven and feeds both initial snapshots and live updates.
 */
import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";

const encoder = new TextEncoder();

const formatEvent = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE entrypoint consumed by the Aurora dashboard.
 * @param request Incoming request so we can subscribe to the AbortSignal for cleanup.
 */
export async function GET(request: Request) {
  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatEvent(event, data)));
      };

      // Prime the stream with the latest snapshot so dashboards hydrate instantly.
      send("init", {
        transactions: transactionCollector.all(100),
        metrics: transactionCollector.metrics()
      });

      // Relay every collector event to SSE clients as they arrive.
      unsubscribe = transactionCollector.subscribe((event) => {
        send(event.type, event.payload);
      });

      // Send keep-alive heartbeats every 15s so proxies and the Vercel runtime keep the stream alive.
      heartbeat = setInterval(() => {
        send("heartbeat", { ts: Date.now() });
      }, 15_000);

      const close = () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        controller.close();
      };

      request.signal.addEventListener("abort", close);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
