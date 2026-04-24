import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { StoreAttributeType, Prisma } from "@prisma/client";

const VALID_TYPES: StoreAttributeType[] = ["MATERIAL", "FINISH", "COLOR", "OTHER"];

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_attributes", "view");
  if (isErrorResponse(result)) return result;

  const typeParam = req.nextUrl.searchParams.get("type");
  const where: Prisma.StoreAttributeValueWhereInput = {};
  if (typeParam && VALID_TYPES.includes(typeParam as StoreAttributeType)) {
    where.type = typeParam as StoreAttributeType;
  }

  const values = await prisma.storeAttributeValue.findMany({
    where,
    include: { translations: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });

  return NextResponse.json({ success: true, data: values });
}

export async function POST(req: NextRequest) {
  const result = await requirePermission("store_attributes", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const type = body.type as StoreAttributeType;
    const code = String(body.code || "").trim().toLowerCase();
    const hexColor = body.hexColor ? String(body.hexColor).trim() : null;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : 0;
    const isActive = body.isActive !== false;
    const translations: Array<{ languageCode: string; label: string }> = Array.isArray(body.translations) ? body.translations : [];

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: "Tipo non valido" }, { status: 400 });
    }
    if (!code || !/^[a-z0-9][a-z0-9_-]*$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "Codice obbligatorio, solo [a-z 0-9 _ -]" },
        { status: 400 }
      );
    }
    if (hexColor && !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hexColor)) {
      return NextResponse.json({ success: false, error: "Colore HEX non valido" }, { status: 400 });
    }

    const created = await prisma.storeAttributeValue.create({
      data: {
        type,
        code,
        hexColor,
        sortOrder,
        isActive,
        translations: translations.length
          ? {
              create: translations
                .filter((t) => t.languageCode && t.label)
                .map((t) => ({
                  languageCode: String(t.languageCode),
                  label: String(t.label).trim(),
                })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Esiste già un valore con questo codice" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
