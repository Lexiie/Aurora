import { BenchmarkRunner } from "@/components/benchmarks/BenchmarkRunner";

export default function BenchmarkPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-0">
      <section className="glass-panel relative overflow-hidden px-8 py-10">
        <div className="absolute inset-0 bg-gradient-to-br from-aurora-cyan/30 via-aurora-purple/20 to-transparent opacity-40" />
        <div className="relative flex flex-col gap-4">
          <span className="text-sm uppercase tracking-[0.3em] text-white/60">Benchmark Mode</span>
          <h1 className="text-4xl font-semibold">Parallel Route Analyzer</h1>
          <p className="max-w-2xl text-base text-white/70">
            Run synthetic Devnet-style benchmarks (mocked) to compare RPC, Jito, and Parallel routes. Export latency curves and refund ratios instantly.
          </p>
        </div>
      </section>
      <BenchmarkRunner />
    </main>
  );
}
