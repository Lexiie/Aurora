"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "./StatusBadge";
import type { TransactionRecord } from "@/lib/types";
import { formatLatency, formatSignature, formatTip, formatTimestamp } from "@/lib/format";

interface TransactionSummaryProps {
  transaction: TransactionRecord;
}

export function TransactionSummary({ transaction }: TransactionSummaryProps) {
  const [copied, setCopied] = useState(false);

  const latency = transaction.confirmTime ? transaction.confirmTime - transaction.createdAt : undefined;
  const routeDescription = (() => {
    switch (transaction.routeUsed) {
      case "tpg":
        return "Sanctum TPG project routing";
      case "mock":
        return "Mock (demo)";
      case "rpc":
      case "jito":
      case "parallel":
        return transaction.routeUsed.toUpperCase();
      default:
        return transaction.routeUsed;
    }
  })();

  const routeSource = (() => {
    switch (transaction.route) {
      case "tpg":
        return "Sanctum TPG";
      case "mock":
        return "Mock";
      case "rpc":
      case "jito":
      case "parallel":
        return transaction.route.toUpperCase();
      default:
        return transaction.route;
    }
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transaction.signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn("Failed to copy signature", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel flex flex-col gap-3 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Signature</p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 font-mono text-base text-aurora-cyan underline-offset-4 hover:underline"
          >
            {formatSignature(transaction.signature, 12)}
          </button>
          {copied ? <p className="text-xs text-aurora-green/90">Copied!</p> : null}
        </div>
        <StatusBadge status={transaction.status} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Routing</p>
          <p className="mt-2 text-sm text-white/80">{routeDescription}</p>
          <p className="text-sm text-white/60">Source: {routeSource}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Confirmation</p>
          <p className="mt-2 text-sm text-white/80">{formatLatency(latency)}</p>
          <p className="text-sm text-white/60">{formatTimestamp(transaction.confirmTime)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Slot</p>
          <p className="mt-2 text-sm text-white/80">{transaction.slot ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Tip</p>
          <p className="mt-2 text-sm text-white/80">{formatTip(transaction.tipLamports)}</p>
          <p className="text-sm text-white/60">Refund: {transaction.refund === undefined ? "— (public feed pending)" : transaction.refund ? "Yes" : "No"}</p>
        </div>
      </div>
      {transaction.error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-sm text-rose-200">
          {transaction.error}
        </div>
      ) : null}
    </motion.div>
  );
}
