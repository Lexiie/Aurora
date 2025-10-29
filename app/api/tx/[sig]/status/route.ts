import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";
import { getTransactionStatus } from "@/lib/gateway";

interface RouteContext {
  params: {
    sig: string;
  };
}

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
