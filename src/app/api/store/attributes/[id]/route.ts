import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { StoreAttributeType } from "@prisma/client";

const VALID_TYPES: StoreAttributeType[] = ["MATERIAL", "FINISH", "COLOR", "OTHER"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_attributes", "view");
  if (isErrorResponse(result)) return result;

  const value = await prisma.storeAttributeValue.findUnique({
    where: { id: params.id },
    include: { translations: true },
  });
  if (!value) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  return NextResponse.json({ success: true, data: value });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_attributes", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const type = body.type as StoreAttributeType | undefined;
    const code = body.code !== undefined ? String(body.code).trim().toLowerCase() : undefined;
    const hexColor = body.hexColor !== undefined ? (body.hexColor ? String(body.hexColor).trim() : null) : undefined;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const translations: Array<{ languageCode: string; label: string }> | undefined = Array.isArray(body.translations)
      ? body.translations
      : undefined;

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: "Tipo non valido" }, { status: 400 });
    }
    if (code !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(code)) {
      return NextResponse.json({ success: false, error: "Codice non valido" }, { status: 400 });
    }
    if (hexColor && !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hexColor)) {
      return NextResponse.json({ success: false, error: "Colore HEX non valido" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const val = await tx.storeAttributeValue.update({
        where: { id: params.id },
        data: { type, code, hexColor, sortOrder, isActive },
      });

      if (translations) {
        await tx.storeAttributeValueTranslation.deleteMany({ where: { valueId: params.id } });
        const clean = translations
          .filter((t) => t.languageCode && t.label)
          .map((t) => ({
            valueId: params.id,
            languageCode: String(t.languageCode),
            label: String(t.label).trim(),
          }));
        if (clean.length) {
          await tx.storeAttributeValueTranslation.createMany({ data: clean });
        }
      }

      return tx.storeAttributeValue.findUnique({
        where: { id: params.id },
        include: { translations: true },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Codice già in uso" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_attributes", "delete");
  if (isErrorResponse(result)) return result;

  try {
    // Impedisci la cancellazione se usato da varianti
    const used = await prisma.storeProductVariantAttribute.count({
      where: { valueId: params.id },
    });
    if (used > 0) {
      return NextResponse.json(
        { success: false, error: `Impossibile cancellare: ${used} variante(i) usano questo valore` },
        { status: 409 }
      );
    }

    await prisma.storeAttributeValue.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
