import { NextResponse } from "next/server";
import { buildTransaction } from "@/lib/gateway";
import type { BuildTransactionRequest } from "@/lib/types";

const resolveBase64 = (payload: Partial<BuildTransactionRequest> & { messageB64?: string }): string | null => {
  if (typeof payload.txB64 === "string" && payload.txB64.length > 0) {
    return payload.txB64;
  }

  if (typeof payload.messageB64 === "string" && payload.messageB64.length > 0) {
    return payload.messageB64;
  }

  return null;
};

const sanitizeOptions = (options: unknown): Record<string, unknown> | undefined => {
  if (!options || typeof options !== "object") {
    return undefined;
  }
  return options as Record<string, unknown>;
};

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
