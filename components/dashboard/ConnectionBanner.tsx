"use client";

import { motion } from "framer-motion";

interface ConnectionBannerProps {
  connected: boolean;
  error?: string;
}

export function ConnectionBanner({ connected, error }: ConnectionBannerProps) {
  if (connected && !error) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200"
    >
      <span className="font-semibold">Gateway offline</span>
      <span className="ml-2 text-rose-100/70">{error ?? "Retrying connection…"}</span>
    </motion.div>
  );
}
