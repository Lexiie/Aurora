/**
 * API route that proxies buildGatewayTransaction to Sanctum TPG.
 * Accepts raw or message-only base64 payloads and keeps sensitive logic server-side.
 */
import { NextResponse } from "next/server";
import { buildTransaction } from "@/lib/gateway";
import type { BuildTransactionRequest } from "@/lib/types";

/**
 * Coerce the request payload into a base64 wire transaction.
 * Supports legacy `messageB64` fields for convenience while preferring `txB64`.
 */
const resolveBase64 = (payload: Partial<BuildTransactionRequest> & { messageB64?: string }): string | null => {
  if (typeof payload.txB64 === "string" && payload.txB64.length > 0) {
    return payload.txB64;
  }

  if (typeof payload.messageB64 === "string" && payload.messageB64.length > 0) {
    return payload.messageB64;
  }

  return null;
};

/**
 * Normalise optional builder options to plain objects.
 * Rejects non-object values to avoid leaking unexpected types into the RPC call.
 */
const sanitizeOptions = (options: unknown): Record<string, unknown> | undefined => {
  if (!options || typeof options !== "object") {
    return undefined;
  }
  return options as Record<string, unknown>;
};

/**
 * Handles build requests by forwarding to `buildGatewayTransaction`.
 * @param request Incoming JSON payload containing `txB64` or `messageB64` and builder options.
 * @returns JSON payload with the built wire transaction ready for signing/sending.
 */
export async function POST(request: Request) {
  try {
    const payload = ((await request.json()) ?? {}) as Partial<BuildTransactionRequest> & {
      messageB64?: string;
    };

    const txB64 = resolveBase64(payload);
    if (!txB64) {
      return NextResponse.json({ error: "Missing required field: txB64" }, { status: 400 });
    }

    const response = await buildTransaction({
      txB64,
      options: sanitizeOptions(payload.options)
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
