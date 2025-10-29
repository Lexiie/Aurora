import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";

const encoder = new TextEncoder();

const formatEvent = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatEvent(event, data)));
      };

      send("init", {
        transactions: transactionCollector.all(100),
        metrics: transactionCollector.metrics()
      });

      unsubscribe = transactionCollector.subscribe((event) => {
        send(event.type, event.payload);
      });

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
