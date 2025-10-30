export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { tpgPost } from "@/lib/gateway";
import { transactionCollector } from "@/lib/collector";

const parseAmountToLamports = (amount: unknown): number | null => {
  if (typeof amount === "number") {
    if (Number.isFinite(amount) && amount > 0) {
      return Math.round(amount * 1e9);
    }
    return null;
  }
  if (typeof amount === "string") {
    const parsed = Number.parseFloat(amount);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 1e9);
    }
  }
  return null;
};

export async function POST(req: NextRequest) {
  try {
    if (process.env.AURORA_CLUSTER !== "devnet") {
      return new Response(JSON.stringify({ error: "Demo route is devnet-only." }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    const body = await req.json();
    const recipient = body?.to as string | undefined;
    const lamports = parseAmountToLamports(body?.amountSol);

    if (!recipient || !lamports) {
      return new Response(JSON.stringify({ error: "Missing to/amountSol" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    const secret = process.env.DEVNET_PAYER_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ error: "Missing DEVNET_PAYER_SECRET" }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
    const payer = Keypair.fromSecretKey(bs58.decode(secret));
    const toPk = new PublicKey(recipient);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: payer.publicKey }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: toPk,
        lamports
      })
    );

    tx.sign(payer);

    const txB64 = Buffer.from(tx.serialize()).toString("base64");
    const signature = await tpgPost<string>("sendTransaction", [txB64, { encoding: "base64" }]);

    transactionCollector.createRecord(signature, "tpg", payer.publicKey.toBase58());
    transactionCollector.markForwarded(signature, "tpg");

    return new Response(JSON.stringify({ signature }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}
