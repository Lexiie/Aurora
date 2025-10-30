import Link from "next/link";
import { notFound } from "next/navigation";
import { transactionCollector } from "@/lib/collector";
import { getTransactionStatus } from "@/lib/gateway";
import type { TransactionRecord, TimelineEntry, TransactionState } from "@/lib/types";
import { TransactionSummary } from "@/components/transactions/TransactionSummary";
import { Timeline } from "@/components/transactions/Timeline";

/**
 * Transaction detail page showing routing metadata and lifecycle timeline.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    sig: string;
  };
}


const mapStateToPhase: Record<TransactionState, TimelineEntry["phase"]> = {
  pending: "submitted",
  forwarded: "forwarded",
  landed: "landed",
  failed: "failed"
};

const buildRecordFromStatus = (signature: string, status: Awaited<ReturnType<typeof getTransactionStatus>>): TransactionRecord => {
  const now = Date.now();
  const confirmTime = status?.confirmTime ?? now;
  const timeline: TimelineEntry[] = [
    {
      phase: "submitted",
      timestamp: status?.confirmTime ? status.confirmTime - 500 : now - 500
    }
  ];

  const statePhase = status?.status ? mapStateToPhase[status.status] : undefined;
  if (statePhase && statePhase !== "submitted") {
    timeline.push({
      phase: statePhase,
      timestamp: confirmTime
    });
  }

  if (status?.refund) {
    timeline.push({
      phase: "refunded",
      timestamp: confirmTime + 100
    });
  }

  return {
    signature,
    route: status?.routeUsed ?? "tpg",
    routeUsed: status?.routeUsed ?? "tpg",
    status: status?.status ?? "pending",
    payer: undefined,
    slot: status?.slot,
    confirmTime,
    refund: status?.refund,
    tipLamports: status?.tipLamports,
    error: status?.error,
    createdAt: (status?.confirmTime ?? now) - 1_000,
    updatedAt: now,
    timeline
  };
};

export default async function TransactionDetailPage({ params }: PageProps) {
  const signature = decodeURIComponent(params.sig);

  let record = transactionCollector.get(signature);

  if (!record) {
    const status = await getTransactionStatus(signature);
    if (!status) {
      notFound();
    }
    record = buildRecordFromStatus(signature, status);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 lg:px-0">
      <Link href="/" className="text-sm text-white/60 hover:text-aurora-cyan">
        ← Back to dashboard
      </Link>
      <TransactionSummary transaction={record} />
      <section className="glass-panel p-6">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-white/60">Interactive view of the transaction lifecycle.</p>
        <div className="mt-6">
          <Timeline timeline={record.timeline} />
        </div>
      </section>
    </main>
  );
}
