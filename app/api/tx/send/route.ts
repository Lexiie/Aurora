import { NextResponse } from "next/server";
import { DEFAULT_JITO_TIP_LAMPORTS, MOCK_GATEWAY } from "@/lib/env";
import { sendTransaction } from "@/lib/gateway";
import { transactionCollector } from "@/lib/collector";
import type { SendTransactionRequest, LiveRoute } from "@/lib/types";

interface SendRequestBody extends SendTransactionRequest {
  payer?: string;
}

const sanitizeOptions = (options: unknown): SendTransactionRequest["options"] => {
  if (!options || typeof options !== "object") {
    return undefined;
  }

  const { encoding, startSlot } = options as { encoding?: string; startSlot?: number };
  const sanitized: SendTransactionRequest["options"] = {};

  if (encoding === "base64") {
    sanitized.encoding = encoding;
  }

  if (typeof startSlot === "number" && Number.isFinite(startSlot)) {
    sanitized.startSlot = startSlot;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SendRequestBody>;

    if (!body?.txB64) {
      return NextResponse.json({ error: "Missing required field: txB64" }, { status: 400 });
    }

    const payload: SendTransactionRequest = {
      txB64: body.txB64,
      options: sanitizeOptions(body.options)
    };

    const { signature } = await sendTransaction(payload);

    const route: LiveRoute = MOCK_GATEWAY ? "mock" : "tpg";
    const initialTip = MOCK_GATEWAY ? DEFAULT_JITO_TIP_LAMPORTS : undefined;

    transactionCollector.createRecord(signature, route, body.payer, initialTip);
    transactionCollector.markForwarded(signature, route);

    return NextResponse.json({ signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
