import Link from "next/link";
import { Dashboard } from "@/components/dashboard/Dashboard";
import SendDevnetForm from "@/components/SendDevnetForm";

/**
 * Aurora landing page combining hero, devnet form, and live dashboard.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-0">
      <section className="glass-panel relative overflow-hidden px-8 py-10">
        <div className="absolute inset-0 bg-gradient-to-br from-aurora-purple/40 via-aurora-cyan/30 to-transparent opacity-40" />
        <div className="relative flex flex-col gap-4">
          <span className="text-sm uppercase tracking-[0.3em] text-white/60">Sanctum Gateway</span>
          <h1 className="text-4xl font-semibold">Aurora Visualization Dashboard</h1>
          <p className="max-w-2xl text-base text-white/70">
            Observe every transaction flowing through Sanctum&apos;s Transaction Processing Gateway (TPG), monitor confirmation latency via Solana RPC, and keep tabs on refund insight as Sanctum rolls out the public feed.
            Benchmark parallel routes on Devnet and debug issues faster with a cinematic Aurora UI.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/benchmarks"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-purple px-5 py-2 text-sm font-medium text-black shadow-glow transition hover:brightness-110"
            >
              Launch Benchmark Mode
            </Link>
          </div>
        </div>
      </section>
      <SendDevnetForm />
      <Dashboard />
    </main>
  );
}
