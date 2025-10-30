/**
 * Lightweight API route exposing the latest KPI snapshot maintained by the collector.
 * Useful for server components or clients that cannot keep an SSE connection open.
 */
import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";

/**
 * Returns the most recent metrics snapshot captured by the collector.
 * @returns JSON payload with aggregated success, latency, and refund insight.
 */
export async function GET() {
  const metrics = transactionCollector.metrics();
  return NextResponse.json({ metrics });
}
