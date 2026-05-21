import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Ritorna i dati necessari per "riprovare" un ordine al checkout:
 * - items pronti come CartItem (con productSlug, coverImage rifetchati dalle varianti correnti)
 * - prefill: dati cliente + indirizzo spedizione + telefono + ecc.
 *
 * Usato dal cliente nell'area riservata sui banner "Riprova" degli ordini
 * ABANDONED_CHECKOUT / PAYMENT_FAILED / PENDING (stripe).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, customerId: customer.id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  }

  // Recupera info correnti delle varianti (slug, cover, prezzo)
  const variantIds = order.items.map((it) => it.variantId).filter((v): v is string => !!v);
  const variants = await prisma.storeProductVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      storeProduct: {
        include: {
          product: { select: { name: true, slug: true, coverImage: true } },
        },
      },
    },
  });
  const vmap = new Map(variants.map((v) => [v.id, v]));

  const items = order.items
    .map((it) => {
      if (!it.variantId) return null;
      const v = vmap.get(it.variantId);
      if (!v) return null;
      const productName = v.storeProduct.product.name;
      const productSlug = v.storeProduct.product.slug;
      const coverImage = v.storeProduct.product.coverImage || null;
      return {
        variantId: it.variantId,
        productSlug,
        productName,
        variantName: it.variantName || null,
        variantAttributes: it.attributesSnapshot || "",
        sku: it.sku,
        priceCents: it.unitPriceCents,
        quantity: it.quantity,
        coverImage,
        volumeM3: Number(it.volumeM3 || 0),
        weightKg: it.weightKg !== null ? Number(it.weightKg) : null,
        shippingClass: "",
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // Indirizzo spedizione + dati cliente snapshot
  let shipping: Record<string, string> = {};
  try { shipping = JSON.parse(order.shippingAddress); } catch { /* */ }

  return NextResponse.json({
    success: true,
    data: {
      items,
      prefill: {
        email: order.email || customer.email,
        firstName: order.firstName || customer.firstName || "",
        lastName: order.lastName || customer.lastName || "",
        phone: order.phone || customer.phone || "",
        taxId: order.customerTaxId || "",
        street: shipping.street || "",
        city: shipping.city || "",
        province: shipping.province || "",
        postalCode: shipping.postalCode || "",
        country: (shipping.country || "IT").toUpperCase(),
        storePickup: !!order.storePickup,
        shippingFloor: String(order.shippingFloor ?? 0),
        withUnboxingService: !!order.withUnboxingService,
        customerNotes: order.customerNotes || "",
      },
    },
  });
}
