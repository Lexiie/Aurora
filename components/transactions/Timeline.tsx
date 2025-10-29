"use client";

import { motion } from "framer-motion";
import type { TimelineEntry } from "@/lib/types";
import { formatTimestamp } from "@/lib/format";

const phaseLabels: Record<TimelineEntry["phase"], string> = {
  submitted: "Submitted",
  forwarded: "Forwarded",
  landed: "Landed",
  failed: "Failed",
  refunded: "Refund"
};

const phaseAccent: Record<TimelineEntry["phase"], string> = {
  submitted: "from-aurora-cyan/70 to-aurora-purple/50",
  forwarded: "from-sky-400/70 to-aurora-cyan/50",
  landed: "from-emerald-400/70 to-aurora-green/40",
  failed: "from-rose-500/70 to-rose-400/40",
  refunded: "from-lime-400/70 to-emerald-300/40"
};

interface TimelineProps {
  timeline: TimelineEntry[];
}

export function Timeline({ timeline }: TimelineProps) {
  const ordered = [...timeline].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent" />
      {ordered.map((entry, index) => (
        <motion.div
          key={`${entry.phase}-${entry.timestamp}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative ml-8 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div
            className={`absolute left-[-1.5rem] top-4 h-3 w-3 rounded-full bg-gradient-to-br ${phaseAccent[entry.phase]} shadow-glow`}
          />
          <p className="text-sm font-medium text-white">{phaseLabels[entry.phase]}</p>
          <p className="mt-1 text-xs text-white/60">{formatTimestamp(entry.timestamp)}</p>
          {entry.latencyMs ? (
            <p className="mt-1 text-xs text-white/50">Latency: {entry.latencyMs} ms</p>
          ) : null}
          {entry.note ? <p className="mt-2 text-xs text-white/50">{entry.note}</p> : null}
        </motion.div>
      ))}
    </div>
  );
}
