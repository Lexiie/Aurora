"use client";

/**
 * Client form that triggers the Devnet demo transfer API.
 * Keeps the demo key on the server while offering a quick way to observe live updates.
 */
import { useState } from "react";

/**
 * Renders the Devnet transfer form and displays feedback when a signature is returned.
 */
export default function SendDevnetForm() {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSend = async () => {
    // POST to the server-side route so signing stays off the client.
    setBusy(true);
    setSig(null);
    setErr(null);
    try {
      const res = await fetch("/api/demo/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, amountSol: amount })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Send failed");
      }
      setSig(data.signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setErr(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-medium text-white/80">Devnet Demo Transfer</div>
      <input
        className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white placeholder:text-white/40 focus:border-aurora-cyan focus:outline-none"
        placeholder="Recipient (Devnet public key)"
        value={to}
        onChange={(event) => setTo(event.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white focus:border-aurora-cyan focus:outline-none"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={busy}
          className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-emerald-400 px-4 py-2 text-sm font-medium text-black shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {sig ? (
        <div className="text-xs text-aurora-cyan/90">
          Signature: <span className="break-all">{sig}</span>
        </div>
      ) : null}
      {err ? <div className="text-xs text-rose-300">{err}</div> : null}
      <div className="text-[11px] text-white/50">Devnet only. The server signs with a demo key stored in `DEVNET_PAYER_SECRET`.</div>
    </div>
  );
}
