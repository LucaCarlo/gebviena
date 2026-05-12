import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStoreGeneralConfig } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

/**
 * Crea un PaymentIntent Stripe e un Order PENDING in DB.
 * Body:
 *   {
 *     items: [{ variantId, quantity }],
 *     customer: { email, firstName, lastName, phone? },
 *     shippingAddress: { street, city, province, postalCode, country },
 *     billingAddress?: ... (default = shipping),
 *     shippingFloor?: number (piano dove scaricare il pacco, 0 = piano terra),
 *     withUnboxingService?: boolean (+20€ se true),
 *     customerNotes?: string,
 *     marketingOptIn?: boolean
 *   }
 *
 * Risposta: { clientSecret, orderId, orderNumber, amount, shippingCents, unboxingFeeCents, ... }
 */
const FREE_SHIPPING_THRESHOLD_CENTS = 95000; // 950 EUR — sopra è gratis
const UNBOXING_FEE_CENTS = 2000; // 20 EUR

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = (body.items as Array<{ variantId: string; quantity: number }>) || [];
    const customer = body.customer || {};
    const shippingAddress = body.shippingAddress;
    const billingAddress = body.billingAddress || shippingAddress;
    const shippingFloor = Number.isFinite(body.shippingFloor) ? Math.max(0, Math.trunc(body.shippingFloor)) : 0;
    const withUnboxingService = body.withUnboxingService === true;

    if (!items.length) return NextResponse.json({ success: false, error: "Carrello vuoto" }, { status: 400 });
    if (!customer.email || !customer.firstName || !customer.lastName) {
      return NextResponse.json({ success: false, error: "Dati cliente mancanti" }, { status: 400 });
    }
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.postalCode || !shippingAddress?.country) {
      return NextResponse.json({ success: false, error: "Indirizzo di spedizione incompleto" }, { status: 400 });
    }

    // Carica le varianti dal DB per verificare prezzi (NEVER trust client)
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
    // include productsPerBox via storeProduct
    const variantsWithBox = variants.map((v) => ({
      ...v,
      productsPerBox: v.storeProduct?.productsPerBox ?? 1,
    }));
    const vmap = new Map(variantsWithBox.map((v) => [v.id, v]));

    const orderItems: Array<{
      variantId: string;
      productName: string;
      variantName: string | null;
      sku: string;
      unitPriceCents: number;
      quantity: number;
      volumeM3: number;
      weightKg: number | null;
      totalCents: number;
      attributesSnapshot: string;
    }> = [];

    let subtotalCents = 0;
    let totalBoxes = 0;

    for (const it of items) {
      const v = vmap.get(it.variantId);
      if (!v) {
        return NextResponse.json({ success: false, error: `Variante ${it.variantId} non disponibile` }, { status: 400 });
      }
      // Stock check
      if (v.trackStock && (v.stockQty ?? 0) < it.quantity) {
        return NextResponse.json({ success: false, error: `Stock insufficiente per ${v.storeProduct.product.name}` }, { status: 400 });
      }
      const qty = Math.max(1, Math.floor(it.quantity));
      // Prezzo effettivo: sale se presente e < normale, altrimenti normale
      const unitPrice = v.salePriceCents != null && v.salePriceCents > 0 && v.salePriceCents < v.priceCents
        ? v.salePriceCents
        : v.priceCents;
      const lineTotal = unitPrice * qty;
      subtotalCents += lineTotal;
      // Scatole: ceil(qty / productsPerBox)
      const perBox = Math.max(1, v.productsPerBox || 1);
      totalBoxes += Math.ceil(qty / perBox);

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

    // Spedizione: tariffa flat per scatola, scalata per paese; gratuita sopra soglia
    const country = (shippingAddress.country || "IT").toUpperCase();
    const boxes = Math.max(1, totalBoxes);
    let shippingCents = 0;
    if (country === "IT") {
      shippingCents = 1500 * boxes; // 15€ per scatola
    } else if (["FR", "DE", "AT", "CH", "ES", "BE", "NL", "PT", "LU", "SI", "DK", "SE", "FI", "IE", "PL"].includes(country)) {
      shippingCents = 4500 * boxes; // 45€ per scatola UE
    } else {
      shippingCents = 9000 * boxes; // 90€ per scatola RoW
    }
    // Surcharge per piano (oltre piano terra): +10€ a piano per ogni scatola, max 5
    if (shippingFloor > 0) {
      const floorSurcharge = Math.min(shippingFloor, 5) * 1000 * boxes;
      shippingCents += floorSurcharge;
    }
    // Spedizione gratuita se subtotale >= soglia
    if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
      shippingCents = 0;
    }
    // Fee disimballo e smaltimento
    const unboxingFeeCents = withUnboxingService ? UNBOXING_FEE_CENTS : 0;

    const cfg = await getStoreGeneralConfig();
    // Prezzi IVA inclusa: tax è informativa, calcolata come "tax compresa"
    const taxRateBp = cfg.taxRateBp;
    const taxCents = Math.round((subtotalCents * taxRateBp) / (10000 + taxRateBp));
    const totalCents = subtotalCents + shippingCents + unboxingFeeCents;

    // Genera orderNumber
    const orderNumber = "GTV-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Cerca o crea customer (guest o esistente)
    let customerId: string | undefined;
    const existingCustomer = await prisma.customer.findUnique({ where: { email: customer.email } });
    if (existingCustomer) {
      customerId = existingCustomer.id;
    }

    // Crea Stripe PaymentIntent
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: cfg.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderNumber,
        items: orderItems.length.toString(),
        customerEmail: customer.email,
      },
      receipt_email: customer.email,
      description: `Order ${orderNumber} — ${customer.firstName} ${customer.lastName}`,
    });

    // Crea Order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        status: "PENDING",
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone || null,
        language: "it",
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        subtotalCents,
        shippingCents,
        shippingFloor,
        withUnboxingService,
        unboxingFeeCents,
        taxCents,
        totalCents,
        currency: cfg.currency,
        taxRateBp,
        paymentProvider: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        customerNotes: body.customerNotes || null,
        items: { create: orderItems },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: totalCents,
        subtotalCents,
        shippingCents,
        unboxingFeeCents,
        taxCents,
        currency: cfg.currency,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-payment-intent] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
