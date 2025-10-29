# Aurora — Sanctum Gateway Visualization Dashboard

Aurora is a dashboard that delivers real-time observability for transactions sent through Sanctum's Transaction Processing Gateway (TPG) on Solana. It streams transaction lifecycle updates, aggregates key KPIs, and offers a mockable benchmark mode to compare RPC, Jito, and Parallel routes.

## ✨ Key Capabilities

- **Live Transaction Feed** — Real-time SSE stream with aurora glow animations, showing route, status, latency, and refund flags per signature.
- **Transaction Timeline** — Interactive detail page with a submitted → forwarded → landed/failed → refund timeline, slot metadata, and copy helpers.
- **Metrics & KPIs** — Success rate, refund insight, p50/p95 confirmation latency, and average tip in SOL, auto-updated as events arrive.
- **Benchmark Mode** — Synthetic (mock) batch runner to preview latency deltas across routes, paired with interactive charts and CSV export.
- **Aurora UI Theme** — Dark glassmorphism, Space Grotesk + Inter typography, Framer Motion micro-animations, and gradient flourishes.

## 🧱 Project Structure

```
app/
  page.tsx                  # Dashboard entrypoint
  tx/[sig]/page.tsx         # Transaction detail timeline
  benchmarks/page.tsx       # Benchmark mode UI
  api/                      # Next.js App Router endpoints
    tx/build/route.ts       # Build tx via Sanctum
    tx/send/route.ts        # Send tx + register collector
    tx/[sig]/status/route.ts# Lookup status
    stream/route.ts         # SSE stream for live updates
    metrics/route.ts        # KPI snapshot
    benchmarks/run/route.ts # Synthetic benchmark simulator
components/
  dashboard/…               # Dashboard composition & alerts
  transactions/…            # Feed, status badge, timelines
  metrics/…                 # KPI cards/grid
  benchmarks/…              # Benchmark charts & runner
hooks/useAuroraStream.ts    # Client hook that consumes SSE
lib/                        # Gateway helpers, collectors, metrics, types
```

## ⚙️ Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create `.env.local`** (example values)
   ```env
   SANCTUM_API_KEY=sk_xxx
   AURORA_CLUSTER=devnet
   SOLANA_RPC_URL=https://api.devnet.solana.com
   DEFAULT_JITO_TIP_LAMPORTS=50000
   MOCK_GATEWAY=true
   ```
   TPG calls use `https://tpg.sanctum.so/v1/{AURORA_CLUSTER}?apiKey=${SANCTUM_API_KEY}` with JSON-RPC methods such as `buildGatewayTransaction` and `sendTransaction`.

   A starter `.env.example` file is included for convenience.
3. **Run the app**
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000` for the dashboard, `http://localhost:3000/benchmarks` for benchmark mode.

If you deploy on Vercel, the included `vercel.json` pins App Router functions to `@vercel/node@3.0.1` (Node.js 20) with a 60s limit, matching the PRD requirement to disable Edge.

### Mock vs Real Gateway

- When `MOCK_GATEWAY=true`, all `/api/tx/*` endpoints produce synthetic signatures and deterministic status progressions (1–3s), enabling UI testing without Solana access.
- Set `MOCK_GATEWAY=false` and provide a valid `SANCTUM_API_KEY` to send JSON-RPC requests to `https://tpg.sanctum.so/v1/{AURORA_CLUSTER}?apiKey=...`. Builder requests call `buildGatewayTransaction`, delivery uses `sendTransaction`, and status tracking relies on Solana `getSignatureStatuses` via `SOLANA_RPC_URL`.
- Refund markers are surfaced once Sanctum exposes them via the public feed; until then, the dashboard labels refund metrics as pending.

### Benchmarks

Benchmark mode currently runs against mocked data to visualise UX flows quickly. Hooks are in place to upgrade the runner to real Devnet transactions once signing/build payloads are available.

## 🔌 APIs & Streaming

- **TPG Builder & Delivery**: `app/api/tx/build` proxies `buildGatewayTransaction`, while `app/api/tx/send` forwards signed wire transactions to `sendTransaction` via `https://tpg.sanctum.so/v1/{cluster}?apiKey=...` (server-only).
- **Status Tracking**: the collector polls Solana RPC `getSignatureStatuses` (≤10 concurrent, ≥800 ms) to detect landed/failed signatures and timestamp confirmations.
- **SSE Stream**: `GET /api/stream` pushes `{ type, payload }` events for `transaction`, `metrics`, and `heartbeat`. The dashboard consumes it via `hooks/useAuroraStream`.
- **In-Memory Metrics**: `transactionCollector` and `lib/metrics` aggregate success, latency, and refund insight snapshots. For distributed deployments, plug in Redis pub/sub.

## 🧭 Future Enhancements

- Persist transaction history and metrics in Redis or a database for multi-instance deployments.
- Backfill transaction detail page directly from the Gateway when the collector misses a signature.
- Elevate benchmark mode to execute real Devnet batches using signed payloads.
- Add Slack/Discord hooks and per-API-key filters (outlined in PRD roadmap).

## ✅ Status

- [x] Live SSE-powered dashboard
- [x] Transaction timeline modal
- [x] KPI aggregation & display
- [x] Benchmark mode UI + CSV export (mocked)
- [x] Mock gateway for local development
- [ ] Production-grade persistence / multi-node support

---
Built for the Sanctum Gateway Hackathon — Aurora v1.1 implementation.
