"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  emphasis?: "primary" | "warning" | "success";
}

const emphasisMap: Record<KpiCardProps["emphasis"], string> = {
  primary: "from-aurora-purple to-aurora-cyan",
  success: "from-aurora-green to-aurora-cyan",
  warning: "from-orange-400 to-aurora-purple"
};

type EmphasisKey = keyof typeof emphasisMap;

export function KpiCard({ title, value, subtitle, emphasis = "primary" }: KpiCardProps) {
  return (
    <motion.div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur",
        "shadow-glass"
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className={clsx(
          "absolute inset-0 opacity-20 blur-3xl",
          "bg-gradient-to-br",
          emphasisMap[emphasis as EmphasisKey]
        )}
      />
      <div className="relative">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">{title}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        {subtitle ? <p className="mt-2 text-sm text-white/60">{subtitle}</p> : null}
      </div>
    </motion.div>
  );
}
