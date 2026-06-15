import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreGeneralConfig, getTaxRateBp } from "@/lib/stripe-config";
import { computeShipping } from "@/lib/shipping-rates";
import { marketFromCountry, resolveVariantPrice } from "@/lib/store-pricing";

export const dynamic = "force-dynamic";

/**
 * Track checkout abbandonato — chiamato in autosave dal frontend quando l'utente
 * sta compilando il form ma non ha ancora cliccato "Procedi al pagamento".
 *
 * Crea (o aggiorna se esiste già un ABANDONED_CHECKOUT linkato allo stesso
 * cartSessionId) un Order con status=ABANDONED_CHECKOUT, paymentProvider=NULL,
 * niente PaymentIntent Stripe, niente email cliente.
 *
 * Idempotente: chiamate ripetute con stesso cartSessionId aggiornano lo stesso ordine.
 * NON crea Customer (lo fa create-payment-intent / create-bonifico-order alla finalizzazione).
 * NON manda email, NON tocca stock.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cartSessionId = String(body.cartSessionId || "").trim().slice(0, 64);
    if (!cartSessionId) return NextResponse.json({ success: false, error: "cartSessionId mancante" }, { status: 400 });

    const items = (body.items as Array<{ variantId: string; quantity: number }>) || [];
    if (!items.length) return NextResponse.json({ success: false, error: "Carrello vuoto" }, { status: 400 });

    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Email non valida" }, { status: 400 });
    }

    const firstName = String(body.firstName || "").trim().slice(0, 128);
    const lastName = String(body.lastName || "").trim().slice(0, 128);
    const phone = String(body.phone || "").trim().slice(0, 64) || null;
    const customerTaxId = String(body.taxId || "").trim().toUpperCase().slice(0, 64) || null;

    const shippingAddress = body.shippingAddress || null;
    const billingAddress = body.billingAddress || shippingAddress;
    const storePickup = body.storePickup === true;
    const shippingFloor = storePickup ? 0 : (Number.isFinite(body.shippingFloor) ? Math.max(0, Math.trunc(body.shippingFloor)) : 0);
    const withUnboxingService = storePickup ? false : body.withUnboxingService === true;

    const ALLOWED_LANGS = new Set(["it", "fr", "en", "de", "es"]);
    const reqLang = typeof body.lang === "string" ? body.lang.toLowerCase().trim() : "";
    const orderLang = ALLOWED_LANGS.has(reqLang) ? reqLang : "it";

    // Snapshot items + totali stimati (verranno comunque ricalcolati alla finalizzazione).
    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.storeProductVariant.findMany({
      where: { id: { in: variantIds }, isPublished: true },
      include: {
        storeProduct: {
          include: {
            product: { select: { name: true, slug: true } },
            translations: { where: { languageCode: "it" }, select: { name: true } },
          },
        },
        attributes: {
          include: {
            value: { include: { translations: { where: { languageCode: "it" }, select: { label: true } } } },
          },
        },
      },
    });
    const vmap = new Map(variants.map((v) => [v.id, { ...v, productsPerBox: v.storeProduct?.productsPerBox ?? 1 }]));

    const country = (shippingAddress?.country || "IT").toUpperCase();
    const market = marketFromCountry(country);

    const orderItems: Array<{
      variantId: string; productName: string; variantName: string | null; sku: string;
      unitPriceCents: number; quantity: number; volumeM3: number; weightKg: number | null;
      totalCents: number; attributesSnapshot: string;
    }> = [];
    let subtotalCents = 0;
    let totalBoxes = 0;
    let totalVolumeM3 = 0;

    for (const it of items) {
      const v = vmap.get(it.variantId);
      if (!v) continue;
      const qty = Math.max(1, Math.floor(it.quantity));
      const unitPrice = resolveVariantPrice(v, market).effectivePriceCents;
      const lineTotal = unitPrice * qty;
      subtotalCents += lineTotal;
      const perBox = Math.max(1, v.productsPerBox || 1);
      totalBoxes += Math.ceil(qty / perBox);
      totalVolumeM3 += Number(v.volumeM3) * qty;
      const productName = v.storeProduct.translations[0]?.name || v.storeProduct.product.name;
      const attrSnapshot = v.attributes
        .map((a) => `${a.value.type}:${a.value.translations[0]?.label || a.value.code}`)
        .join("|");
      orderItems.push({
        variantId: v.id,
        productName,
        variantName: null,
        sku: v.sku,
        unitPriceCents: unitPrice,
        quantity: qty,
        volumeM3: Number(v.volumeM3),
        weightKg: v.weightKg !== null ? Number(v.weightKg) : null,
        totalCents: lineTotal,
        attributesSnapshot: attrSnapshot,
      });
    }

    if (!orderItems.length) {
      return NextResponse.json({ success: false, error: "Nessuna variante valida nel carrello" }, { status: 400 });
    }

    const shippingResult = await computeShipping({
      country,
      postalCode: shippingAddress?.postalCode || "",
      province: shippingAddress?.province || "",
      totalVolumeM3,
      totalBoxes,
      subtotalCents,
      shippingFloor,
      withUnboxingService,
    });
    const shippingCents = storePickup ? 0 : shippingResult.standardShippingCents + shippingResult.floorDeliveryCents;
    const unboxingFeeCents = storePickup ? 0 : shippingResult.unboxingFeeCents;

    const cfg = await getStoreGeneralConfig();
    const taxRateBpMarket = getTaxRateBp(cfg, market);
    const taxCents = Math.round((subtotalCents * taxRateBpMarket) / (10000 + taxRateBpMarket));
    const totalCents = subtotalCents + shippingCents + unboxingFeeCents;

    // Trova un ABANDONED_CHECKOUT linkato a questo cartSessionId (via Cart.convertedOrderId).
    const cart = await prisma.cart.findUnique({
      where: { sessionId: cartSessionId },
      select: { convertedOrderId: true },
    });
    let trackedOrderId: string | null = null;
    if (cart?.convertedOrderId) {
      const o = await prisma.order.findUnique({
        where: { id: cart.convertedOrderId },
        select: { id: true, status: true },
      });
      if (o && o.status === "ABANDONED_CHECKOUT") trackedOrderId = o.id;
    }

    if (trackedOrderId) {
      // Aggiorna ordine esistente. Sostituiamo gli items col carrello attuale.
      await prisma.orderItem.deleteMany({ where: { orderId: trackedOrderId } });
      await prisma.order.update({
        where: { id: trackedOrderId },
        data: {
          email,
          firstName: firstName || "",
          lastName: lastName || "",
          phone,
          language: orderLang,
          customerTaxId,
          shippingAddress: JSON.stringify(shippingAddress || {}),
          billingAddress: JSON.stringify(billingAddress || shippingAddress || {}),
          subtotalCents,
          shippingCents,
          shippingFloor,
          withUnboxingService,
          unboxingFeeCents,
          storePickup,
          taxCents,
          totalCents,
          currency: cfg.currency,
          taxRateBp: taxRateBpMarket,
          customerNotes: body.customerNotes || null,
          items: { create: orderItems },
        },
      });
      return NextResponse.json({ success: true, data: { orderId: trackedOrderId, updated: true } });
    }

    // Crea nuovo ABANDONED_CHECKOUT (senza Customer: lo creiamo alla finalizzazione).
    const orderNumber = "GTV-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: null,
        status: "ABANDONED_CHECKOUT",
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        phone,
        language: orderLang,
        customerTaxId,
        shippingAddress: JSON.stringify(shippingAddress || {}),
        billingAddress: JSON.stringify(billingAddress || shippingAddress || {}),
        subtotalCents,
        shippingCents,
        shippingFloor,
        withUnboxingService,
        unboxingFeeCents,
        storePickup,
        taxCents,
        totalCents,
        currency: cfg.currency,
        taxRateBp: taxRateBpMarket,
        paymentProvider: null,
        customerNotes: body.customerNotes || null,
        items: { create: orderItems },
      },
    });

    // Lega il Cart all'ordine ABANDONED_CHECKOUT (NON marchiamo converted=true).
    await prisma.cart.upsert({
      where: { sessionId: cartSessionId },
      update: { convertedOrderId: order.id, email },
      create: {
        sessionId: cartSessionId,
        convertedOrderId: order.id,
        email,
        items: JSON.stringify(orderItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity, priceCents: i.unitPriceCents }))),
        subtotalCents,
        itemCount: orderItems.reduce((s, i) => s + i.quantity, 0),
        currency: cfg.currency,
        language: orderLang,
      },
    }).catch(() => { /* silent: il tracking dell'abbandono non deve bloccare */ });

    return NextResponse.json({ success: true, data: { orderId: order.id, created: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[track-abandoned] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
