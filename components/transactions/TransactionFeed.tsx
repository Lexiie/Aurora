"use client";

/**
 * Aurora dashboard feed rendering the live transaction stream with route/latency metadata.
 * Consumes the aggregated SSE state to provide a rolling window of recent activity.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatLatency, formatSignature, formatTimestamp } from "@/lib/format";
import type { TransactionRecord } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface TransactionFeedProps {
  transactions: TransactionRecord[];
}

const routeLabel = (route: TransactionRecord["routeUsed"]): string => {
  // Map internal route codes to human readable labels for the feed.
  switch (route) {
    case "tpg":
      return "Project routing";
    case "mock":
      return "Mock";
    case "rpc":
    case "jito":
    case "parallel":
      return route.toUpperCase();
    default:
      return route;
  }
};

const feedVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

/**
 * Renders the transaction feed table using the latest SSE snapshot.
 * @param transactions Recent transaction records sorted by update time.
 */
export function TransactionFeed({ transactions }: TransactionFeedProps) {
  return (
    <div className="glass-panel">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold">Live Transaction Feed</h2>
        <span className="text-sm text-white/50">{transactions.length} active</span>
      </div>
      <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-2 px-6 py-3 text-xs uppercase tracking-wide text-white/40">
        <span>Signature</span>
        <span>Routing</span>
        <span>Status</span>
        <span>Latency</span>
        <span>Refund (public)</span>
      </div>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-aurora-navy via-aurora-navy/95 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-aurora-navy via-aurora-navy/95 to-transparent" />
        <div className="max-h-[480px] space-y-2 overflow-y-auto px-6 py-4">
          <AnimatePresence initial={false}>
            {transactions.map((tx) => (
              <motion.div
                key={tx.signature}
                layout
                variants={feedVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35 }}
                whileHover={{ scale: 1.01, boxShadow: "0 0 25px rgba(127,90,240,0.25)" }}
                className="group grid grid-cols-[3fr_1fr_1fr_1fr_1fr] items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/90 shadow-glass transition"
              >
                <Link
                  href={`/tx/${tx.signature}`}
                  className="truncate font-mono text-xs text-aurora-cyan underline-offset-4 group-hover:underline"
                >
                  {formatSignature(tx.signature, 8)}
                </Link>
                <span className="capitalize text-white/70">{routeLabel(tx.routeUsed)}</span>
                <StatusBadge status={tx.status} />
                <span>{formatLatency(tx.confirmTime ? tx.confirmTime - tx.createdAt : undefined)}</span>
                <span className={tx.refund ? "text-aurora-green" : "text-white/50"}>
                  {tx.refund === undefined ? "—" : tx.refund ? "Yes" : "No"}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-3 text-xs text-white/40 space-y-1">
        <p>Updated {formatTimestamp(Date.now())}</p>
        <p className="text-[11px] text-white/50">Refund insights will appear once Sanctum publishes the public feed.</p>
      </div>
    </div>
  );
}
