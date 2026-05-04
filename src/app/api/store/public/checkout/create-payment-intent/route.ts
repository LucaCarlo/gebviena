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
 *     customerNotes?: string,
 *     marketingOptIn?: boolean
 *   }
 *
 * Risposta: { clientSecret, orderId, orderNumber, amount }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = (body.items as Array<{ variantId: string; quantity: number }>) || [];
    const customer = body.customer || {};
    const shippingAddress = body.shippingAddress;
    const billingAddress = body.billingAddress || shippingAddress;

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
    const vmap = new Map(variants.map((v) => [v.id, v]));

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
    let totalVolumeM3 = 0;

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
      const lineTotal = v.priceCents * qty;
      subtotalCents += lineTotal;
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
        unitPriceCents: v.priceCents,
        quantity: qty,
        volumeM3: Number(v.volumeM3),
        weightKg: v.weightKg !== null ? Number(v.weightKg) : null,
        totalCents: lineTotal,
        attributesSnapshot: attrSnapshot,
      });
    }

    // Spedizione MVP: tariffa flat in base al paese
    const country = (shippingAddress.country || "IT").toUpperCase();
    let shippingCents = 0;
    if (country === "IT") shippingCents = totalVolumeM3 < 0.1 ? 1500 : totalVolumeM3 < 0.5 ? 3500 : 7500;
    else if (["FR", "DE", "AT", "CH", "ES", "BE", "NL", "PT", "LU", "SI", "DK", "SE", "FI", "IE", "PL"].includes(country)) shippingCents = totalVolumeM3 < 0.1 ? 4500 : totalVolumeM3 < 0.5 ? 9000 : 18000;
    else shippingCents = totalVolumeM3 < 0.1 ? 9000 : totalVolumeM3 < 0.5 ? 18000 : 35000;

    const cfg = await getStoreGeneralConfig();
    // Prezzi IVA inclusa: tax è informativa, calcolata come "tax compresa"
    const taxRateBp = cfg.taxRateBp;
    const taxCents = Math.round((subtotalCents * taxRateBp) / (10000 + taxRateBp));
    const totalCents = subtotalCents + shippingCents;

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
