import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

interface Params {
  params: { id: string; lang: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const result = await requirePermission("settings", "view");
  if (isErrorResponse(result)) return result;

  const tr = await prisma.formConfigTranslation.findUnique({
    where: { formConfigId_languageCode: { formConfigId: params.id, languageCode: params.lang } },
  });

  return NextResponse.json({ success: true, data: tr });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const { fields } = await req.json();
    if (typeof fields !== "string") {
      return NextResponse.json({ success: false, error: "fields deve essere una stringa JSON" }, { status: 400 });
    }

    const saved = await prisma.formConfigTranslation.upsert({
      where: { formConfigId_languageCode: { formConfigId: params.id, languageCode: params.lang } },
      update: { fields },
      create: { formConfigId: params.id, languageCode: params.lang, fields },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const result = await requirePermission("settings", "edit");
  if (isErrorResponse(result)) return result;

  try {
    await prisma.formConfigTranslation.deleteMany({
      where: { formConfigId: params.id, languageCode: params.lang },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
