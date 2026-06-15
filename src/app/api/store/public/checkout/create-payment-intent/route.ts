import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStoreGeneralConfig, getTaxRateBp } from "@/lib/stripe-config";
import { computeShipping } from "@/lib/shipping-rates";
import { marketFromCountry, resolveVariantPrice } from "@/lib/store-pricing";
import { sendCapiEvent } from "@/lib/fb-capi";

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = (body.items as Array<{ variantId: string; quantity: number }>) || [];
    const customer = body.customer || {};
    const shippingAddress = body.shippingAddress;
    const billingAddress = body.billingAddress || shippingAddress;
    const storePickup = body.storePickup === true;
    const shippingFloor = storePickup ? 0 : (Number.isFinite(body.shippingFloor) ? Math.max(0, Math.trunc(body.shippingFloor)) : 0);
    const withUnboxingService = storePickup ? false : body.withUnboxingService === true;

    if (!items.length) return NextResponse.json({ success: false, error: "Carrello vuoto" }, { status: 400 });
    if (!customer.email || !customer.firstName || !customer.lastName) {
      return NextResponse.json({ success: false, error: "Dati cliente mancanti" }, { status: 400 });
    }
    const customerTaxId = String(customer.taxId || "").trim().toUpperCase().slice(0, 64);
    if (!customerTaxId) {
      return NextResponse.json({ success: false, error: "P.IVA o Codice Fiscale obbligatorio" }, { status: 400 });
    }
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.postalCode || !shippingAddress?.country) {
      return NextResponse.json({ success: false, error: "Indirizzo di spedizione incompleto" }, { status: 400 });
    }

    // Mercato = country di spedizione (FR usa prezzi FR + IVA 20%, IT usa IT + 22%).
    const market = marketFromCountry(shippingAddress.country);
    // Lingua dell'ordine: dalla request (frontend store con useLang()); fallback a "it".
    const ALLOWED_LANGS = new Set(["it", "fr", "en", "de", "es"]);
    const reqLang = typeof body.lang === "string" ? body.lang.toLowerCase().trim() : "";
    const orderLang = ALLOWED_LANGS.has(reqLang) ? reqLang : "it";

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
      // Prezzo per mercato (FR cade su IT se non valorizzato; sale se < base).
      const resolved = resolveVariantPrice(v, market);
      const unitPrice = resolved.effectivePriceCents;
      const lineTotal = unitPrice * qty;
      subtotalCents += lineTotal;
      // Scatole: ceil(qty / productsPerBox)
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

    // ─── Spedizione: calcolo via helper centralizzato ───────────────────
    // IT: tariffa flat per regione (lookup via codice provincia, fallback CAP).
    // FR: per m³ (186€/m³, 300€/m³ Corsica CAP "20…").
    // Altri paesi: 90€/scatola fallback.
    // Soglia free shipping 950€ azzera SOLO la standard.
    // Piano (consegna al piano) e disimballo restano additivi anche con free.
    const shippingResult = await computeShipping({
      country: (shippingAddress.country || "IT").toUpperCase(),
      postalCode: shippingAddress.postalCode || "",
      province: shippingAddress.province || "",
      totalVolumeM3,
      totalBoxes,
      subtotalCents,
      shippingFloor,
      withUnboxingService,
    });
    // shippingCents (sul DB Order) = standard + piano. unboxingFeeCents resta separato.
    // Ritiro in negozio: nessun costo di spedizione né servizi aggiuntivi.
    const shippingCents = storePickup ? 0 : shippingResult.standardShippingCents + shippingResult.floorDeliveryCents;
    const unboxingFeeCents = storePickup ? 0 : shippingResult.unboxingFeeCents;
    console.log("[create-payment-intent] shipping calc:", shippingResult.notes.join(" · "));

    const cfg = await getStoreGeneralConfig();
    // Prezzi IVA inclusa: la tax è informativa, calcolata come "tax compresa"
    // (back-out dal lordo). L'aliquota dipende dal mercato di spedizione e
    // arriva ora dai setting admin (Generale → IVA IT/FR).
    const taxRateBpMarket = getTaxRateBp(cfg, market);
    const taxCents = Math.round((subtotalCents * taxRateBpMarket) / (10000 + taxRateBpMarket));
    const totalCents = subtotalCents + shippingCents + unboxingFeeCents;

    // Se esiste già un Order ABANDONED_CHECKOUT linkato a questo cartSessionId
    // (creato dall'autosave track-abandoned mentre l'utente compilava il form),
    // riusiamo il suo orderNumber: cosi' lo promuoveremo poi a PENDING invece
    // di crearne uno nuovo, e l'orderNumber esposto al cliente resta coerente.
    const cartSessionId = typeof body.cartSessionId === "string" ? body.cartSessionId.trim().slice(0, 64) : "";
    let abandonedOrderId: string | null = null;
    let abandonedOrderNumber: string | null = null;
    if (cartSessionId) {
      const cart = await prisma.cart.findUnique({
        where: { sessionId: cartSessionId },
        select: { convertedOrderId: true },
      });
      if (cart?.convertedOrderId) {
        const o = await prisma.order.findUnique({
          where: { id: cart.convertedOrderId },
          select: { id: true, status: true, orderNumber: true },
        });
        if (o && o.status === "ABANDONED_CHECKOUT") {
          abandonedOrderId = o.id;
          abandonedOrderNumber = o.orderNumber;
        }
      }
    }
    const orderNumber = abandonedOrderNumber
      || ("GTV-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase());

    // Cerca o crea customer. Se non esiste, lo creiamo SENZA password (passwordHash=null):
    // dopo il pagamento gli mandiamo un magic-link per impostarla. Se esiste già,
    // aggiorniamo nome/telefono/lingua sui campi mancanti senza sovrascrivere ciò che ha.
    const existingCustomer = await prisma.customer.findUnique({ where: { email: customer.email } });
    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName: existingCustomer.firstName || customer.firstName,
          lastName: existingCustomer.lastName || customer.lastName,
          phone: existingCustomer.phone || customer.phone || null,
          language: existingCustomer.language || orderLang,
          taxCode: existingCustomer.taxCode || customerTaxId,
        },
      });
    } else {
      const created = await prisma.customer.create({
        data: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
          language: orderLang,
          taxCode: customerTaxId,
          passwordHash: null,
          isActive: true,
        },
      });
      customerId = created.id;
    }

    // Crea Stripe PaymentIntent.
    // Usiamo automatic_payment_methods + allow_redirects:'always' per abilitare
    // tutti i metodi configurati nel Dashboard Stripe (card, Klarna, PayPal, Amazon Pay, ecc.).
    // L'attivazione di ogni singolo metodo va fatta dal Dashboard Stripe (Settings → Payment methods).
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: cfg.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true, allow_redirects: "always" },
      shipping: {
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        phone: customer.phone || undefined,
        address: {
          line1: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.province || undefined,
          postal_code: shippingAddress.postalCode,
          country: (shippingAddress.country || "IT").toUpperCase(),
        },
      },
      metadata: {
        orderNumber,
        items: orderItems.length.toString(),
        customerEmail: customer.email,
      },
      receipt_email: customer.email,
      description: `Order ${orderNumber} — ${customer.firstName} ${customer.lastName}`,
    });

    let order;
    if (abandonedOrderId) {
      // Promuovi ABANDONED_CHECKOUT → PENDING + stripe. Sostituisci gli items col carrello attuale.
      await prisma.orderItem.deleteMany({ where: { orderId: abandonedOrderId } });
      order = await prisma.order.update({
        where: { id: abandonedOrderId },
        data: {
          customerId,
          status: "PENDING",
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
          language: orderLang,
          customerTaxId,
          shippingAddress: JSON.stringify(shippingAddress),
          billingAddress: JSON.stringify(billingAddress),
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
          paymentProvider: "stripe",
          paymentMethodType: null,
          paymentErrorMessage: null,
          stripePaymentIntentId: paymentIntent.id,
          customerNotes: body.customerNotes || null,
          items: { create: orderItems },
        },
      });
    } else {
      order = await prisma.order.create({
        data: {
          orderNumber,
          customerId,
          status: "PENDING",
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || null,
          language: orderLang,
          customerTaxId,
          shippingAddress: JSON.stringify(shippingAddress),
          billingAddress: JSON.stringify(billingAddress),
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
          paymentProvider: "stripe",
          stripePaymentIntentId: paymentIntent.id,
          customerNotes: body.customerNotes || null,
          items: { create: orderItems },
        },
      });
    }

    // Marca il Cart come converted (così esce dalla lista "carrelli abbandonati")
    if (cartSessionId) {
      prisma.cart.updateMany({
        where: { sessionId: cartSessionId },
        data: { converted: true, convertedOrderId: order.id },
      }).catch(() => { /* silent */ });
    }

    // Meta CAPI: AddPaymentInfo server-side, dedup col client via event_id = `${orderNumber}:api`
    {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      const clientUserAgent = req.headers.get("user-agent") || null;
      sendCapiEvent({
        eventName: "AddPaymentInfo",
        eventId: `${order.orderNumber}:api`,
        actionSource: "website",
        userData: {
          email: customer.email,
          phone: customer.phone || null,
          firstName: customer.firstName || null,
          lastName: customer.lastName || null,
          city: shippingAddress.city || null,
          postalCode: shippingAddress.postalCode || null,
          country: shippingAddress.country || null,
          externalId: customerId,
          clientIp,
          clientUserAgent,
        },
        customData: {
          value: totalCents / 100,
          currency: cfg.currency,
          content_type: "product",
          content_ids: orderItems.map((i) => i.variantId).filter((x): x is string => !!x),
          num_items: orderItems.reduce((s, i) => s + i.quantity, 0),
          order_id: order.orderNumber,
        },
      }).catch((err) => console.error("[create-payment-intent] CAPI AddPaymentInfo error:", err));
    }

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: totalCents,
        subtotalCents,
        shippingCents,
        // Breakdown spedizione (per visualizzazione UI):
        standardShippingCents: shippingResult.standardShippingCents,
        floorDeliveryCents: shippingResult.floorDeliveryCents,
        freeStandardShippingApplied: shippingResult.freeShippingApplied,
        resolvedRegion: shippingResult.resolvedRegion,
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
