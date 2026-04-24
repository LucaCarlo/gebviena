import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { ShippingClass } from "@prisma/client";

const VALID_CLASSES: ShippingClass[] = ["STANDARD", "FRAGILE", "OVERSIZED", "QUOTE_ONLY"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const sku = String(body.sku || "").trim();
    const priceCents = Number.isFinite(body.priceCents) ? Math.trunc(body.priceCents) : 0;
    const stockQty = body.stockQty === null || body.stockQty === undefined ? null : Math.max(0, Math.trunc(Number(body.stockQty)));
    const trackStock = body.trackStock === true;
    const volumeM3 = Number.isFinite(body.volumeM3) ? Number(body.volumeM3) : 0;
    const weightKg = body.weightKg === null || body.weightKg === undefined ? null : Number(body.weightKg);
    const shippingClass: ShippingClass = VALID_CLASSES.includes(body.shippingClass) ? body.shippingClass : "STANDARD";
    const coverImage = body.coverImage ? String(body.coverImage) : null;
    const galleryImages = body.galleryImages ? String(body.galleryImages) : null;
    const isDefault = body.isDefault === true;
    const isPublished = body.isPublished === true;
    const sortOrder = Number.isFinite(body.sortOrder) ? Math.trunc(body.sortOrder) : 0;
    const attributeValueIds: string[] = Array.isArray(body.attributeValueIds) ? body.attributeValueIds : [];

    if (!sku) {
      return NextResponse.json({ success: false, error: "SKU obbligatorio" }, { status: 400 });
    }

    const sp = await prisma.storeProduct.findUnique({ where: { id: params.id } });
    if (!sp) return NextResponse.json({ success: false, error: "StoreProduct non trovato" }, { status: 404 });

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.storeProductVariant.updateMany({
          where: { storeProductId: params.id },
          data: { isDefault: false },
        });
      }
      const v = await tx.storeProductVariant.create({
        data: {
          storeProductId: params.id,
          sku,
          priceCents,
          stockQty,
          trackStock,
          volumeM3,
          weightKg,
          shippingClass,
          coverImage,
          galleryImages,
          isDefault,
          isPublished,
          sortOrder,
          attributes: attributeValueIds.length
            ? { create: attributeValueIds.map((valueId) => ({ valueId })) }
            : undefined,
        },
        include: {
          attributes: { include: { value: { include: { translations: true } } } },
          translations: true,
        },
      });
      return v;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "SKU già in uso" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
