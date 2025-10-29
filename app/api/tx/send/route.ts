import { NextResponse } from "next/server";
import { DEFAULT_JITO_TIP_LAMPORTS } from "@/lib/env";
import { sendTransaction } from "@/lib/gateway";
import { transactionCollector } from "@/lib/collector";
import type { RouteType, SendTransactionRequest } from "@/lib/types";

interface SendRequestBody extends SendTransactionRequest {
  payer?: string;
}

const validateRoute = (route: string | undefined): route is RouteType =>
  route === "rpc" || route === "jito" || route === "parallel";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SendRequestBody>;

    if (!body?.txB64) {
      return NextResponse.json({ error: "Missing required field: txB64" }, { status: 400 });
    }

    if (!validateRoute(body.route)) {
      return NextResponse.json({ error: "Invalid or missing route" }, { status: 400 });
    }

    const jitoTipLamports =
      typeof body.jitoTipLamports === "number" && body.jitoTipLamports > 0
        ? body.jitoTipLamports
        : body.route === "rpc"
        ? undefined
        : DEFAULT_JITO_TIP_LAMPORTS;

    const payload: SendTransactionRequest = {
      txB64: body.txB64,
      route: body.route,
      jitoTipLamports
    };

    const response = await sendTransaction(payload);

    transactionCollector.createRecord(response.signature, body.route, body.payer, jitoTipLamports);
    transactionCollector.markForwarded(response.signature, response.routeUsed);

    return NextResponse.json({
      signature: response.signature,
      routeRequested: body.route,
      routeUsed: response.routeUsed,
      jitoTipLamports
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
