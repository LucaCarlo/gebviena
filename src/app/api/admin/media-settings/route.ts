import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { DEFAULT_MEDIA_SETTINGS, invalidateMediaSettingsCache, type MediaSettings } from "@/lib/image";

export const dynamic = "force-dynamic";

export async function GET() {
  const authErr = await requirePermission("settings", "view");
  if (isErrorResponse(authErr)) return authErr;

  const row = await prisma.setting.findUnique({ where: { key: "media_settings" } });
  let data: MediaSettings = DEFAULT_MEDIA_SETTINGS;
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<MediaSettings>;
      data = {
        ...DEFAULT_MEDIA_SETTINGS,
        ...parsed,
        presets: { ...DEFAULT_MEDIA_SETTINGS.presets, ...(parsed.presets || {}) },
      };
    } catch { /* fallback default */ }
  }
  return NextResponse.json({ success: true, data, defaults: DEFAULT_MEDIA_SETTINGS });
}

export async function PUT(req: NextRequest) {
  const authErr = await requirePermission("settings", "edit");
  if (isErrorResponse(authErr)) return authErr;

  const body = (await req.json().catch(() => null)) as Partial<MediaSettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Body invalido" }, { status: 400 });
  }

  // Merge con default per tolleranza a payload parziali
  const merged: MediaSettings = {
    ...DEFAULT_MEDIA_SETTINGS,
    ...body,
    presets: { ...DEFAULT_MEDIA_SETTINGS.presets, ...(body.presets || {}) },
  };

  // Clamp/normalizza valori
  const clamp = (n: unknown, min: number, max: number, fb: number) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fb;
    return Math.min(max, Math.max(min, Math.round(v)));
  };
  (Object.keys(merged.presets) as Array<keyof typeof merged.presets>).forEach((k) => {
    const p = merged.presets[k];
    merged.presets[k] = {
      maxWidth: clamp(p.maxWidth, 100, 6000, DEFAULT_MEDIA_SETTINGS.presets[k].maxWidth),
      maxHeight: clamp(p.maxHeight, 100, 6000, DEFAULT_MEDIA_SETTINGS.presets[k].maxHeight),
      quality: clamp(p.quality, 30, 100, DEFAULT_MEDIA_SETTINGS.presets[k].quality),
    };
  });
  merged.mediumMaxWidth = clamp(merged.mediumMaxWidth, 200, 4000, DEFAULT_MEDIA_SETTINGS.mediumMaxWidth);
  merged.mediumQuality = clamp(merged.mediumQuality, 30, 100, DEFAULT_MEDIA_SETTINGS.mediumQuality);
  merged.thumbnailMaxWidth = clamp(merged.thumbnailMaxWidth, 100, 800, DEFAULT_MEDIA_SETTINGS.thumbnailMaxWidth);
  merged.thumbnailQuality = clamp(merged.thumbnailQuality, 30, 100, DEFAULT_MEDIA_SETTINGS.thumbnailQuality);
  if (!["webp", "jpeg", "preserve"].includes(merged.format)) merged.format = "webp";
  merged.keepOriginal = !!merged.keepOriginal;
  merged.generateVariants = merged.generateVariants !== false;

  const value = JSON.stringify(merged);
  await prisma.setting.upsert({
    where: { key: "media_settings" },
    create: { key: "media_settings", value, group: "media" },
    update: { value, group: "media" },
  });

  invalidateMediaSettingsCache();
  return NextResponse.json({ success: true, data: merged });
}
