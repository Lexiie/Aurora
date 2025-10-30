"use client";

/**
 * Reusable glassmorphism card used by the KPI grid to surface headline metrics.
 */
import { motion } from "framer-motion";
import clsx from "clsx";

type Emphasis = "primary" | "warning" | "success";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  emphasis?: Emphasis;
}

const emphasisMap: Record<Emphasis, string> = {
  primary: "from-aurora-purple to-aurora-cyan",
  success: "from-aurora-green to-aurora-cyan",
  warning: "from-orange-400 to-aurora-purple"
};

export function KpiCard({ title, value, subtitle, emphasis = "primary" }: KpiCardProps) {
  const emphasisClass = emphasisMap[emphasis];
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
          emphasisClass
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
