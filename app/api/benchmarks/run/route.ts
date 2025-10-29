import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/benchmark";
import type { BenchmarkParameters } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = ((await request.json()) ?? {}) as Partial<BenchmarkParameters>;
    const result = await runBenchmark({
      runs: payload.runs,
      routes: payload.routes,
      delayMs: payload.delayMs
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("MOCK_GATEWAY") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
