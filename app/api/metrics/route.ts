import { NextResponse } from "next/server";
import { transactionCollector } from "@/lib/collector";

export async function GET() {
  const metrics = transactionCollector.metrics();
  return NextResponse.json({ metrics });
}
