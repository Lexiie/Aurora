/**
 * Fetches the latest status for a single signature, reusing collector cache when possible.
 * Used by direct detail page requests before the SSE channel hydrates the client.
 */
import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";
import { getTransactionStatus } from "@/lib/gateway";

interface RouteContext {
  params: {
    sig: string;
  };
}

/**
 * Returns the tracked status for the requested signature.
 * @param _request Unused request object (reserved for future enhancements).
 * @param context Dynamic route params containing the signature.
 */
export async function GET(_request: Request, context: RouteContext) {
  const signature = context.params?.sig;

  if (!signature) {
    return NextResponse.json({ error: "Missing transaction signature" }, { status: 400 });
  }

  const existing = transactionCollector.get(signature);
  if (existing) {
    return NextResponse.json(existing);
  }

  try {
    const status = await getTransactionStatus(signature);
    if (!status) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
