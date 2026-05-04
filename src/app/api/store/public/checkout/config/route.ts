import { NextResponse } from "next/server";
import { getStripeConfig } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

/** Restituisce solo la publishable key al client (mai la secret). */
export async function GET() {
  const cfg = await getStripeConfig();
  return NextResponse.json({
    success: true,
    data: { publishableKey: cfg.publishableKey, mode: cfg.mode },
  });
}
