import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_SECURITY_SETTINGS, invalidateSecuritySettingsCache, type SecuritySettings } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const authErr = await requirePermission("settings", "view");
  if (isErrorResponse(authErr)) return authErr;
  const row = await prisma.setting.findUnique({ where: { key: "security_settings" } });
  let data: SecuritySettings = DEFAULT_SECURITY_SETTINGS;
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<SecuritySettings>;
      data = { ...DEFAULT_SECURITY_SETTINGS, ...parsed };
    } catch { /* fallback default */ }
  }
  return NextResponse.json({ success: true, data, defaults: DEFAULT_SECURITY_SETTINGS });
}

export async function PUT(req: NextRequest) {
  const authErr = await requirePermission("settings", "edit");
  if (isErrorResponse(authErr)) return authErr;
  const body = (await req.json().catch(() => null)) as Partial<SecuritySettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Body invalido" }, { status: 400 });
  }
  const clamp = (n: unknown, min: number, max: number, fb: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fb;
    return Math.min(max, Math.max(min, Math.round(v)));
  };
  const merged: SecuritySettings = {
    autoBanEnabled: body.autoBanEnabled !== false,
    hitsPerHourThreshold: clamp(body.hitsPerHourThreshold, 10, 100000, DEFAULT_SECURITY_SETTINGS.hitsPerHourThreshold),
    hitsPerPathPerHourThreshold: clamp(body.hitsPerPathPerHourThreshold, 5, 100000, DEFAULT_SECURITY_SETTINGS.hitsPerPathPerHourThreshold),
    autoBanDurationHours: clamp(body.autoBanDurationHours, 0, 24 * 365, DEFAULT_SECURITY_SETTINGS.autoBanDurationHours),
  };
  const value = JSON.stringify(merged);
  await prisma.setting.upsert({
    where: { key: "security_settings" },
    create: { key: "security_settings", value, group: "security" },
    update: { value, group: "security" },
  });
  invalidateSecuritySettingsCache();
  return NextResponse.json({ success: true, data: merged });
}
