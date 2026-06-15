import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeShipping, getFreeShippingThresholdCents } from "@/lib/shipping-rates";
import { marketFromCountry, resolveVariantPrice } from "@/lib/store-pricing";

export const dynamic = "force-dynamic";

/**
 * Quote spedizione live (senza creare Order né Stripe PaymentIntent).
 *
 * Usato dal checkout per ricalcolare subtotale + spedizione mentre l'utente
 * digita l'indirizzo e cambia i servizi aggiuntivi, senza dover premere
 * "Continua al pagamento".
 *
 * Body:
 *   {
 *     items: [{ variantId, quantity }],
 *     country: "IT"|"FR"|...,
 *     postalCode: "...",
 *     province: "MI"|...,
 *     shippingFloor: 0|1|2|...,
 *     withUnboxingService: boolean
 *   }
 *
 * Risposta sempre 200 con success=true; in caso di carrello vuoto o address
 * mancante restituisce un quote "neutro" così il frontend può mostrare
 * placeholder senza dover gestire errori intermedi durante la digitazione.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const items = (body.items as Array<{ variantId: string; quantity: number }>) || [];
    const country = String(body.country || "IT").toUpperCase();
    const postalCode = String(body.postalCode || "").trim();
    const province = String(body.province || "").trim();
    const storePickup = body.storePickup === true;
    const shippingFloor = storePickup ? 0 : (Number.isFinite(body.shippingFloor) ? Math.max(0, Math.trunc(body.shippingFloor)) : 0);
    const withUnboxingService = storePickup ? false : body.withUnboxingService === true;

    const freeShippingThresholdCents = await getFreeShippingThresholdCents();

    if (!items.length) {
      return NextResponse.json({
        success: true,
        data: emptyQuote(country, freeShippingThresholdCents),
      });
    }

    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.storeProductVariant.findMany({
      where: { id: { in: variantIds }, isPublished: true },
      select: {
        id: true, priceCents: true, salePriceCents: true,
        priceFrCents: true, salePriceFrCents: true,
        volumeM3: true, storeProduct: { select: { productsPerBox: true } },
      },
    });
    const vmap = new Map(variants.map((v) => [v.id, v]));

    const market = marketFromCountry(country);
    let subtotalCents = 0;
    let totalBoxes = 0;
    let totalVolumeM3 = 0;
    // Prezzi per-item risolti dal mercato (paese di spedizione): servono al
    // checkout per mostrare il prezzo FR quando il paese è Francia, anche se
    // l'utente sta navigando in italiano.
    const lines: Array<{ variantId: string; unitPriceCents: number; quantity: number; lineCents: number }> = [];

    for (const it of items) {
      const v = vmap.get(it.variantId);
      if (!v) continue; // ignora silenziosamente: è solo un quote
      const qty = Math.max(1, Math.floor(it.quantity));
      const unitPrice = resolveVariantPrice(v, market).effectivePriceCents;
      subtotalCents += unitPrice * qty;
      lines.push({ variantId: it.variantId, unitPriceCents: unitPrice, quantity: qty, lineCents: unitPrice * qty });
      const perBox = Math.max(1, v.storeProduct?.productsPerBox || 1);
      totalBoxes += Math.ceil(qty / perBox);
      totalVolumeM3 += Number(v.volumeM3) * qty;
    }

    // Ritiro in negozio: nessun costo di spedizione, nessun indirizzo richiesto.
    if (storePickup) {
      return NextResponse.json({
        success: true,
        data: {
          ready: true,
          country,
          market,
          lines,
          subtotalCents,
          totalVolumeM3,
          billableVolumeM3: Math.max(1, Math.ceil(totalVolumeM3)),
          totalBoxes,
          standardShippingCents: 0,
          floorDeliveryCents: 0,
          unboxingFeeCents: 0,
          totalShippingCents: 0,
          freeShippingApplied: false,
          freeShippingThresholdCents,
          resolvedRegion: "Ritiro al punto di vendita",
          notes: [],
          storePickup: true,
          totalCents: subtotalCents,
        },
      });
    }

    // Se l'indirizzo non è ancora utilizzabile (no CAP e no provincia per IT,
    // no CAP per FR) → mostriamo un quote "incompleto" che lato UI verrà
    // mostrato come "—" o "in attesa indirizzo".
    const addressUsable =
      country === "IT" ? (postalCode.length >= 2 || province.length >= 2)
      : country === "FR" ? postalCode.length >= 2
      : true;

    if (!addressUsable) {
      return NextResponse.json({
        success: true,
        data: {
          ...emptyQuote(country, freeShippingThresholdCents),
          subtotalCents,
          totalVolumeM3,
          totalBoxes,
          lines,
          market,
          ready: false,
          missing: country === "IT" ? "provincia o CAP" : "CAP",
        },
      });
    }

    const result = await computeShipping({
      country,
      postalCode,
      province,
      totalVolumeM3,
      totalBoxes,
      subtotalCents,
      shippingFloor,
      withUnboxingService,
    });

    return NextResponse.json({
      success: true,
      data: {
        ready: true,
        country,
        market,
        lines,
        subtotalCents,
        totalVolumeM3,
        billableVolumeM3: Math.max(1, Math.ceil(totalVolumeM3)),
        totalBoxes,
        standardShippingCents: result.standardShippingCents,
        floorDeliveryCents: result.floorDeliveryCents,
        unboxingFeeCents: result.unboxingFeeCents,
        totalShippingCents: result.totalShippingCents,
        freeShippingApplied: result.freeShippingApplied,
        freeShippingThresholdCents,
        resolvedRegion: result.resolvedRegion,
        notes: result.notes,
        totalCents: subtotalCents + result.totalShippingCents,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function emptyQuote(country: string, freeShippingThresholdCents: number) {
  return {
    ready: false,
    country,
    subtotalCents: 0,
    totalVolumeM3: 0,
    billableVolumeM3: 1,
    totalBoxes: 0,
    standardShippingCents: 0,
    floorDeliveryCents: 0,
    unboxingFeeCents: 0,
    totalShippingCents: 0,
    freeShippingApplied: false,
    freeShippingThresholdCents,
    resolvedRegion: null as string | null,
    notes: [] as string[],
    totalCents: 0,
  };
}
