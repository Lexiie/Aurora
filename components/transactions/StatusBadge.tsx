"use client";

import clsx from "clsx";
import type { TransactionRecord } from "@/lib/types";

const statusStyles: Record<TransactionRecord["status"], string> = {
  pending: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
  forwarded: "bg-sky-500/20 text-sky-200 border border-sky-300/30",
  landed: "bg-emerald-500/20 text-emerald-200 border border-emerald-300/30",
  failed: "bg-rose-500/20 text-rose-200 border border-rose-300/30"
};

export function StatusBadge({ status }: { status: TransactionRecord["status"] }) {
  return <span className={clsx("rounded-full px-3 py-1 text-xs font-medium uppercase", statusStyles[status])}>{status}</span>;
}
