"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { BenchmarkRouteStats } from "@/lib/types";

interface BenchmarkChartsProps {
  stats: BenchmarkRouteStats[];
}

const tooltipStyle = {
  backgroundColor: "rgba(10, 10, 25, 0.9)",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  padding: 12,
  color: "white"
};

export function BenchmarkCharts({ stats }: BenchmarkChartsProps) {
  if (!stats.length) {
    return null;
  }

  const percentData = stats.map((item) => ({
    route: item.route,
    successRate: item.successRate,
    failureRate: item.failureRate,
    refundRate: item.refundRate
  }));

  const latencyData = stats.map((item) => ({
    route: item.route,
    averageLatencyMs: item.averageLatencyMs,
    p95LatencyMs: item.p95LatencyMs ?? item.averageLatencyMs
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold">Success vs Failure vs Refund</h3>
        <p className="text-sm text-white/60">Percentages per route</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={percentData}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="route" stroke="rgba(255,255,255,0.6)" tickLine={false} />
              <YAxis unit="%" stroke="rgba(255,255,255,0.6)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,90,240,0.1)" }} />
              <Legend />
              <Bar dataKey="successRate" name="Success" fill="rgba(44,182,125,0.8)" radius={[12, 12, 0, 0]} />
              <Bar dataKey="failureRate" name="Failure" fill="rgba(244,63,94,0.7)" radius={[12, 12, 0, 0]} />
              <Bar dataKey="refundRate" name="Refund" fill="rgba(92,225,230,0.7)" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold">Latency Benchmarks</h3>
        <p className="text-sm text-white/60">Average vs p95 latency</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="route" stroke="rgba(255,255,255,0.6)" tickLine={false} />
              <YAxis unit="ms" stroke="rgba(255,255,255,0.6)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="averageLatencyMs" name="Avg" stroke="#5CE1E6" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="p95LatencyMs" name="p95" stroke="#7F5AF0" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
