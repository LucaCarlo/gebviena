import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

const STORE_GROUPS = ["store_stripe", "store_email", "store_general"] as const;

export async function GET(_req: NextRequest) {
  const result = await requirePermission("store_settings", "view");
  if (isErrorResponse(result)) return result;

  const settings = await prisma.setting.findMany({
    where: { group: { in: [...STORE_GROUPS] } },
  });

  // Return as flat object keyed by setting key, for easier form binding.
  const out: Record<string, { value: string; group: string }> = {};
  for (const s of settings) {
    out[s.key] = { value: s.value, group: s.group };
  }

  return NextResponse.json({ success: true, data: out });
}

export async function PUT(req: NextRequest) {
  const result = await requirePermission("store_settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const entries = body.settings as Array<{ key: string; value: string; group: string }>;
    if (!Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: "Campo 'settings' mancante" }, { status: 400 });
    }

    for (const s of entries) {
      if (!s.key) continue;
      if (!STORE_GROUPS.includes(s.group as (typeof STORE_GROUPS)[number])) continue;
      await prisma.setting.upsert({
        where: { key: s.key },
        update: { value: String(s.value ?? ""), group: s.group },
        create: { key: s.key, value: String(s.value ?? ""), group: s.group },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
