import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.setting.findMany({
      where: { group: "store_sale_banner" },
      select: { key: true, value: true },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      success: true,
      data: {
        enabled: map.get("store.sale_banner.enabled") === "true",
        endDate: map.get("store.sale_banner.end_date") || null,
        messageIt: map.get("store.sale_banner.message_it") || "",
        messageFr: map.get("store.sale_banner.message_fr") || "",
        countdownPrefixIt: map.get("store.sale_banner.countdown_prefix_it") || "",
        countdownPrefixFr: map.get("store.sale_banner.countdown_prefix_fr") || "",
      },
    });
  } catch {
    return NextResponse.json({ success: true, data: { enabled: false, endDate: null, messageIt: "", messageFr: "", countdownPrefixIt: "", countdownPrefixFr: "" } });
  }
}
