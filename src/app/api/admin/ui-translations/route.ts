import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET() {
  const result = await requirePermission("settings", "view");
  if (isErrorResponse(result)) return result;

  const overrides = await prisma.uiTranslationOverride.findMany();
  return NextResponse.json({ success: true, data: overrides });
}

export async function PUT(req: NextRequest) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { key, languageCode, value } = body as { key: string; languageCode: string; value: string };
    if (!key || !languageCode) {
      return NextResponse.json({ success: false, error: "key e languageCode obbligatori" }, { status: 400 });
    }
    if (!value || !value.trim()) {
      // Empty value = remove override (revert to default)
      await prisma.uiTranslationOverride.deleteMany({ where: { key, languageCode } });
      return NextResponse.json({ success: true, deleted: true });
    }
    const data = await prisma.uiTranslationOverride.upsert({
      where: { key_languageCode: { key, languageCode } },
      update: { value },
      create: { key, languageCode, value },
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
