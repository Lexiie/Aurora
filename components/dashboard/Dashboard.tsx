"use client";

/**
 * Main dashboard container that wires Aurora stream data into KPI cards and the feed.
 */
import { useAuroraStream } from "@/hooks/useAuroraStream";
import { KpiGrid } from "@/components/metrics/KpiGrid";
import { TransactionFeed } from "@/components/transactions/TransactionFeed";
import { ConnectionBanner } from "./ConnectionBanner";
import { motion } from "framer-motion";

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel flex flex-col items-center justify-center gap-3 px-10 py-16 text-center"
  >
    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-aurora-cyan/40 to-aurora-purple/40 blur-md" />
    <h2 className="text-xl font-semibold">No transactions yet</h2>
    <p className="max-w-md text-sm text-white/60">
      Trigger a build/send flow using your Sanctum Gateway API key to watch live status updates, performance metrics, and refunds.
    </p>
  </motion.div>
);

/**
 * Composes the banner, KPI grid, and transaction feed based on SSE state.
 */
export function Dashboard() {
  const { transactions, metrics, connectionState } = useAuroraStream();

  return (
    <div className="space-y-6">
      <ConnectionBanner connected={connectionState.connected} error={connectionState.error} />
      <KpiGrid metrics={metrics} />
      {transactions.length > 0 ? <TransactionFeed transactions={transactions} /> : <EmptyState />}
    </div>
  );
}
