/**
 * Simulates benchmark runs in mock mode so the UI can visualise latency deltas.
 * Delegates the heavy lifting to the shared `runBenchmark` helper.
 */
import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/benchmark";
import type { BenchmarkParameters } from "@/lib/types";

/**
 * Executes a synthetic benchmark run.
 * @param request Payload containing optional route filters and run counts.
 * @returns JSON object with per-route stats and CSV output.
 */
export async function POST(request: Request) {
  try {
    const payload = ((await request.json()) ?? {}) as Partial<BenchmarkParameters>;

    const params: BenchmarkParameters = {
      runs: typeof payload.runs === "number" ? payload.runs : undefined,
      routes: Array.isArray(payload.routes) ? payload.routes : undefined,
      delayMs: typeof payload.delayMs === "number" ? payload.delayMs : undefined
    };

    const result = await runBenchmark(params);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("MOCK_GATEWAY") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
