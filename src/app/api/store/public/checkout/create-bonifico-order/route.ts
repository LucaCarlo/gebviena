import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreGeneralConfig } from "@/lib/stripe-config";
import { computeShipping } from "@/lib/shipping-rates";
import { marketFromCountry, resolveVariantPrice, vatRateBp } from "@/lib/store-pricing";
import { sendOrderConfirmationEmail } from "@/lib/order-email";
import { sendCapiEvent } from "@/lib/fb-capi";

export const dynamic = "force-dynamic";

/**
 * Crea un Order in DB con paymentProvider="bonifico" (nessun Stripe PaymentIntent).
 * L'ordine resta PENDING finché l'admin non lo segna PAID manualmente dopo aver
 * ricevuto il bonifico in banca. L'email di conferma con le coordinate bancarie
 * viene inviata IMMEDIATAMENTE alla creazione dell'ordine.
 *
 * Body: identico a create-payment-intent (items, customer, shippingAddress, ...)
 * Risposta: { orderId, orderNumber, amountCents, ... } — niente clientSecret.
 */
export async function POST(req: NextRequest) {
  try {
    // Hard guard: il bonifico deve essere esplicitamente abilitato in Admin → Impostazioni → Pagamenti.
    const enabledRow = await prisma.setting.findUnique({ where: { key: "pay_bonifico_enabled" } });
    if (enabledRow?.value !== "true") {
      return NextResponse.json({ success: false, error: "Pagamento via bonifico non abilitato" }, { status: 403 });
    }

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

    const market = marketFromCountry(shippingAddress.country);
    const ALLOWED_LANGS = new Set(["it", "fr", "en", "de", "es"]);
    const reqLang = typeof body.lang === "string" ? body.lang.toLowerCase().trim() : "";
    const orderLang = ALLOWED_LANGS.has(reqLang) ? reqLang : "it";

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
      if (!v) return NextResponse.json({ success: false, error: `Variante ${it.variantId} non disponibile` }, { status: 400 });
      if (v.trackStock && (v.stockQty ?? 0) < it.quantity) {
        return NextResponse.json({ success: false, error: `Stock insufficiente per ${v.storeProduct.product.name}` }, { status: 400 });
      }
      const qty = Math.max(1, Math.floor(it.quantity));
      const resolved = resolveVariantPrice(v, market);
      const unitPrice = resolved.effectivePriceCents;
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
    const shippingCents = storePickup ? 0 : shippingResult.standardShippingCents + shippingResult.floorDeliveryCents;
    const unboxingFeeCents = storePickup ? 0 : shippingResult.unboxingFeeCents;

    const cfg = await getStoreGeneralConfig();
    const taxRateBpMarket = vatRateBp(market);
    const taxCents = Math.round((subtotalCents * taxRateBpMarket) / (10000 + taxRateBpMarket));
    const totalCents = subtotalCents + shippingCents + unboxingFeeCents;

    // Se esiste già un Order ABANDONED_CHECKOUT linkato a questo cartSessionId
    // (autosave track-abandoned), lo promuoviamo a PENDING + bonifico riusando
    // il suo orderNumber, invece di crearne uno nuovo.
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
          select: { id: true, status: true, orderNumber: true, paymentProvider: true, totalCents: true, email: true },
        });
        if (o && o.status === "ABANDONED_CHECKOUT") {
          abandonedOrderId = o.id;
          abandonedOrderNumber = o.orderNumber;
        } else if (
          o
          && o.status === "PENDING"
          && o.paymentProvider === "bonifico"
          && o.email === customer.email
          && o.totalCents === totalCents
        ) {
          // Idempotenza: il cliente ha già completato il checkout bonifico per
          // questo carrello (es. refresh + re-submit). Restituisce l'ordine esistente
          // senza creare un duplicato né rimandare la mail di conferma.
          return NextResponse.json({
            success: true,
            data: {
              orderId: o.id,
              orderNumber: o.orderNumber,
              amountCents: o.totalCents,
              currency: cfg.currency,
              status: "PENDING",
              paymentProvider: "bonifico",
              duplicateAttempt: true,
            },
          });
        }
      }
    }

    // Fallback aggiuntivo (sempre attivo): stessa email + stesso totale + bonifico
    // PENDING negli ultimi 30 minuti. Copre il caso in cui il cartSessionId sia
    // stato perso (nuova tab, incognito, browser diverso) ma il cliente sta in
    // realtà rifacendo lo stesso ordine. Evita doppi invii email.
    {
      const recentDup = await prisma.order.findFirst({
        where: {
          email: customer.email,
          paymentProvider: "bonifico",
          status: "PENDING",
          totalCents,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
        select: { id: true, orderNumber: true, totalCents: true },
        orderBy: { createdAt: "desc" },
      });
      if (recentDup) {
        return NextResponse.json({
          success: true,
          data: {
            orderId: recentDup.id,
            orderNumber: recentDup.orderNumber,
            amountCents: recentDup.totalCents,
            currency: cfg.currency,
            status: "PENDING",
            paymentProvider: "bonifico",
            duplicateAttempt: true,
          },
        });
      }
    }
    const orderNumber = abandonedOrderNumber
      || ("GTV-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase());

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

    let order;
    if (abandonedOrderId) {
      // Promuovi ABANDONED_CHECKOUT → PENDING + bonifico, sostituendo gli items.
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
          paymentProvider: "bonifico",
          paymentMethodType: null,
          paymentErrorMessage: null,
          stripePaymentIntentId: null,
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
          paymentProvider: "bonifico",
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

    // Invio email cliente + admin SUBITO: non aspettiamo il webhook (non c'è).
    // Idempotente via confirmationEmailSentAt — fire-and-forget.
    sendOrderConfirmationEmail(order.id).catch((err) => {
      console.error("[create-bonifico-order] sendOrderConfirmationEmail error:", err);
    });

    // Meta CAPI: AddPaymentInfo server-side, dedup col client via event_id = `${orderNumber}:api`.
    // Per bonifico questo è l'unico momento "pre-Purchase" valido: il vero Purchase
    // partirà quando l'admin marcherà l'ordine PAID.
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
      }).catch((err) => console.error("[create-bonifico-order] CAPI AddPaymentInfo error:", err));
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: totalCents,
        subtotalCents,
        shippingCents,
        standardShippingCents: shippingResult.standardShippingCents,
        floorDeliveryCents: shippingResult.floorDeliveryCents,
        freeStandardShippingApplied: shippingResult.freeShippingApplied,
        resolvedRegion: shippingResult.resolvedRegion,
        unboxingFeeCents,
        taxCents,
        currency: cfg.currency,
        paymentProvider: "bonifico",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-bonifico-order] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
