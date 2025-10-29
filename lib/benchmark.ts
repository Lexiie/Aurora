import { randomUUID } from "node:crypto";
import { AURORA_CLUSTER, MOCK_GATEWAY } from "./env";
import {
  BenchmarkParameters,
  BenchmarkResult,
  BenchmarkRouteStats,
  RouteType
} from "./types";

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const defaultRunsPerRoute = 50;

const simulateRoute = (route: RouteType, runs: number): BenchmarkRouteStats & { samples: number[] } => {
  const samples: number[] = [];
  let successCount = 0;
  let refundCount = 0;

  for (let i = 0; i < runs; i += 1) {
    let baseline: number;
    switch (route) {
      case "parallel":
        baseline = randomBetween(450, 850);
        break;
      case "jito":
        baseline = randomBetween(550, 1_000);
        break;
      default:
        baseline = randomBetween(750, 1_400);
        break;
    }

    const latency = baseline + randomBetween(-60, 120);
    samples.push(Math.max(250, Math.round(latency)));

    const isFailure = Math.random() < (route === "rpc" ? 0.04 : 0.015);
    const isRefund = !isFailure && route !== "rpc" && Math.random() < (route === "parallel" ? 0.5 : 0.15);
    if (!isFailure) {
      successCount += 1;
    }
    if (isRefund) {
      refundCount += 1;
    }
  }

  const successRate = (successCount / runs) * 100;
  const failureRate = 100 - successRate;
  const refundRate = (refundCount / runs) * 100;
  const averageLatencyMs = samples.reduce((acc, value) => acc + value, 0) / samples.length;

  return {
    route,
    successRate: Number(successRate.toFixed(2)),
    failureRate: Number(failureRate.toFixed(2)),
    refundRate: Number(refundRate.toFixed(2)),
    averageLatencyMs: Number(averageLatencyMs.toFixed(1)),
    p95LatencyMs: percentile(samples, 95),
    samples
  };
};

const toCsv = (stats: Array<BenchmarkRouteStats & { samples: number[] }>) => {
  const rows: string[] = ["route,iteration,latencyMs"];
  stats.forEach((routeStats) => {
    routeStats.samples.forEach((latency, iteration) => {
      rows.push(`${routeStats.route},${iteration + 1},${latency}`);
    });
  });

  return rows.join("\n");
};

export const runBenchmark = async (
  params: BenchmarkParameters
): Promise<BenchmarkResult> => {
  if (!MOCK_GATEWAY) {
    throw new Error("Benchmark mode currently available only when MOCK_GATEWAY=true");
  }

  const runs = params.runs && params.runs > 0 ? params.runs : defaultRunsPerRoute;
  const routes = params.routes?.length ? params.routes : (["rpc", "jito", "parallel"] satisfies RouteType[]);

  const statsWithSamples = routes.map((route) => simulateRoute(route, runs));

  const result: BenchmarkResult = {
    id: randomUUID(),
    createdAt: Date.now(),
    cluster: AURORA_CLUSTER,
    routes,
    runs,
    stats: statsWithSamples.map(({ samples, ...rest }) => rest),
    csv: toCsv(statsWithSamples)
  };

  return result;
};
