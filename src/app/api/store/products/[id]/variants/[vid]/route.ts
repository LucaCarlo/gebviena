import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { ShippingClass } from "@prisma/client";

const VALID_CLASSES: ShippingClass[] = ["STANDARD", "FRAGILE", "OVERSIZED", "QUOTE_ONLY"];

type VariantTranslation = { languageCode: string; name?: string | null; description?: string | null };

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; vid: string } }
) {
  const result = await requirePermission("store_products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.sku !== undefined) data.sku = String(body.sku).trim();
    if (body.priceCents !== undefined) data.priceCents = Math.trunc(Number(body.priceCents));
    if (body.stockQty !== undefined) data.stockQty = body.stockQty === null ? null : Math.max(0, Math.trunc(Number(body.stockQty)));
    if (body.trackStock !== undefined) data.trackStock = body.trackStock === true;
    if (body.volumeM3 !== undefined) data.volumeM3 = Number(body.volumeM3);
    if (body.weightKg !== undefined) data.weightKg = body.weightKg === null ? null : Number(body.weightKg);
    if (body.shippingClass !== undefined) {
      data.shippingClass = VALID_CLASSES.includes(body.shippingClass) ? body.shippingClass : "STANDARD";
    }
    if (body.coverImage !== undefined) data.coverImage = body.coverImage ? String(body.coverImage) : null;
    if (body.galleryImages !== undefined) data.galleryImages = body.galleryImages ? String(body.galleryImages) : null;
    if (body.isPublished !== undefined) data.isPublished = body.isPublished === true;
    if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder));

    const attributeValueIds: string[] | undefined = Array.isArray(body.attributeValueIds) ? body.attributeValueIds : undefined;
    const translations: VariantTranslation[] | undefined = Array.isArray(body.translations) ? body.translations : undefined;
    const newIsDefault: boolean | undefined = typeof body.isDefault === "boolean" ? body.isDefault : undefined;

    const variant = await prisma.$transaction(async (tx) => {
      const existing = await tx.storeProductVariant.findUnique({ where: { id: params.vid } });
      if (!existing || existing.storeProductId !== params.id) {
        throw new Error("Variante non trovata per questo prodotto");
      }

      if (newIsDefault === true) {
        await tx.storeProductVariant.updateMany({
          where: { storeProductId: params.id, id: { not: params.vid } },
          data: { isDefault: false },
        });
        data.isDefault = true;
      } else if (newIsDefault === false) {
        data.isDefault = false;
      }

      await tx.storeProductVariant.update({ where: { id: params.vid }, data });

      if (attributeValueIds !== undefined) {
        await tx.storeProductVariantAttribute.deleteMany({ where: { variantId: params.vid } });
        if (attributeValueIds.length) {
          await tx.storeProductVariantAttribute.createMany({
            data: attributeValueIds.map((valueId) => ({ variantId: params.vid, valueId })),
          });
        }
      }

      if (translations !== undefined) {
        await tx.storeProductVariantTranslation.deleteMany({ where: { variantId: params.vid } });
        const clean = translations
          .filter((t) => t.languageCode && (t.name || t.description))
          .map((t) => ({
            variantId: params.vid,
            languageCode: String(t.languageCode),
            name: t.name ? String(t.name).trim() : null,
            description: t.description ? String(t.description) : null,
          }));
        if (clean.length) await tx.storeProductVariantTranslation.createMany({ data: clean });
      }

      return tx.storeProductVariant.findUnique({
        where: { id: params.vid },
        include: {
          attributes: { include: { value: { include: { translations: true } } } },
          translations: true,
        },
      });
    });

    return NextResponse.json({ success: true, data: variant });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "SKU già in uso" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; vid: string } }) {
  const result = await requirePermission("store_products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const variant = await prisma.storeProductVariant.findUnique({ where: { id: params.vid } });
    if (!variant || variant.storeProductId !== params.id) {
      return NextResponse.json({ success: false, error: "Variante non trovata" }, { status: 404 });
    }

    const count = await prisma.storeProductVariant.count({ where: { storeProductId: params.id } });
    if (count <= 1) {
      return NextResponse.json({ success: false, error: "Non puoi cancellare l'unica variante: il prodotto deve avere almeno una variante" }, { status: 409 });
    }

    await prisma.storeProductVariant.delete({ where: { id: params.vid } });

    // Assicura che ci sia sempre una variante default
    const hasDefault = await prisma.storeProductVariant.findFirst({
      where: { storeProductId: params.id, isDefault: true },
    });
    if (!hasDefault) {
      const first = await prisma.storeProductVariant.findFirst({
        where: { storeProductId: params.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (first) {
        await prisma.storeProductVariant.update({ where: { id: first.id }, data: { isDefault: true } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
