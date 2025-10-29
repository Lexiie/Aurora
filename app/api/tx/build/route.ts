import { NextResponse } from "next/server";
import { buildTransaction } from "@/lib/gateway";
import type { BuildTransactionRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<BuildTransactionRequest>;
    if (!payload?.payer) {
      return NextResponse.json({ error: "Missing required field: payer" }, { status: 400 });
    }

    const response = await buildTransaction(payload as BuildTransactionRequest);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
