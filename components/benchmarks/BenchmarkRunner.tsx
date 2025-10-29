"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { BenchmarkResult, RouteType } from "@/lib/types";
import { BenchmarkCharts } from "./BenchmarkCharts";

const ROUTE_LABELS: Record<RouteType, string> = {
  rpc: "RPC",
  jito: "Jito",
  parallel: "Parallel"
};

const DEFAULT_ROUTES: RouteType[] = ["rpc", "jito", "parallel"];

export function BenchmarkRunner() {
  const [runs, setRuns] = useState(50);
  const [routes, setRoutes] = useState<RouteType[]>(DEFAULT_ROUTES);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleRoute = (route: RouteType) => {
    setRoutes((prev) =>
      prev.includes(route) ? prev.filter((item) => item !== route) : [...prev, route]
    );
  };

  const csvBlobUrl = useMemo(() => {
    if (!result?.csv) {
      return null;
    }
    return URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
  }, [result]);


  useEffect(() => {
    return () => {
      if (csvBlobUrl) {
        URL.revokeObjectURL(csvBlobUrl);
      }
    };
  }, [csvBlobUrl]);
  const runBenchmark = async () => {
    if (routes.length === 0) {
      setError("Select at least one route");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/benchmarks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs, routes })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error ?? "Failed to run benchmark");
      }

      const payload = (await response.json()) as BenchmarkResult;
      setResult(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <h2 className="text-xl font-semibold">Benchmark Mode</h2>
        <p className="text-sm text-white/60">Run synthetic Devnet batches (mocked) to compare routes.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50" htmlFor="runs">
                Runs per route
              </label>
              <input
                id="runs"
                type="number"
                min={1}
                value={runs}
                onChange={(event) => setRuns(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-aurora-cyan focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Routes</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {DEFAULT_ROUTES.map((route) => {
                  const selected = routes.includes(route);
                  return (
                    <button
                      key={route}
                      type="button"
                      onClick={() => handleToggleRoute(route)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        selected
                          ? "bg-aurora-purple/40 text-white border border-aurora-cyan/40"
                          : "border border-white/20 text-white/60 hover:text-white"
                      }`}
                    >
                      {ROUTE_LABELS[route]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4">
            <p className="text-sm text-white/60">
              Benchmark mode triggers mock batches so you can preview performance deltas before wiring real Devnet transactions.
            </p>
            <button
              type="button"
              onClick={runBenchmark}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-purple px-6 py-3 text-sm font-medium text-black shadow-glow transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Running Benchmark…" : "Run Benchmark"}
            </button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {csvBlobUrl ? (
              <a
                href={csvBlobUrl}
                download={`aurora-benchmark-${result?.id}.csv`}
                className="text-sm text-aurora-cyan underline-offset-4 hover:underline"
              >
                Download CSV export
              </a>
            ) : null}
          </div>
        </div>
      </motion.div>
      {result ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold">Benchmark Summary</h3>
            <p className="text-sm text-white/60">
              {result.runs} runs per route · Cluster: {result.cluster}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {result.stats.map((stat) => (
                <div key={stat.route} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">{ROUTE_LABELS[stat.route]}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{stat.successRate}% success</p>
                  <p className="text-sm text-white/60">Refund {stat.refundRate}%</p>
                  <p className="text-sm text-white/60">Avg Lat {stat.averageLatencyMs} ms</p>
                  <p className="text-sm text-white/60">p95 {stat.p95LatencyMs ?? "—"} ms</p>
                </div>
              ))}
            </div>
          </div>
          <BenchmarkCharts stats={result.stats} />
        </motion.div>
      ) : null}
    </div>
  );
}
