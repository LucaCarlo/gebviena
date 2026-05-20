import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeConfig } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

/** Restituisce config Stripe (solo publishable key) + flag pagamenti alternativi (bonifico). */
export async function GET() {
  const cfg = await getStripeConfig();
  const bonificoRow = await prisma.setting.findUnique({ where: { key: "pay_bonifico_enabled" } }).catch(() => null);
  const bonificoEnabled = bonificoRow?.value === "true";
  return NextResponse.json({
    success: true,
    data: {
      publishableKey: cfg.publishableKey,
      mode: cfg.mode,
      bonificoEnabled,
    },
  });
}
