import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/fb-capi";

export const dynamic = "force-dynamic";

/**
 * Endpoint pubblico tracking — AddToCart server-side gemello dell'evento
 * pixel firato dal CartContext quando l'utente aggiunge una variante.
 * Il client passa lo stesso eventID che usa per fbq, così Meta dedupa.
 *
 * Body: { eventID, variantId, productName?, value, num_items? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventID = String(body.eventID || "").trim();
    if (!eventID) {
      return NextResponse.json({ success: false, error: "eventID mancante" }, { status: 400 });
    }

    const variantId = String(body.variantId || "").trim();
    const productName = typeof body.productName === "string" ? body.productName : undefined;
    const value = Number.isFinite(body.value) ? body.value : 0;
    const numItems = Number.isFinite(body.num_items) ? Math.max(0, Math.trunc(body.num_items)) : 1;
    const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "EUR";

    const cookieHeader = req.headers.get("cookie") || "";
    const fbp = cookieHeader.match(/(?:^|; )_fbp=([^;]+)/)?.[1] || null;
    const fbc = cookieHeader.match(/(?:^|; )_fbc=([^;]+)/)?.[1] || null;

    await sendCapiEvent({
      eventName: "AddToCart",
      eventId: eventID,
      eventSourceUrl: body.eventSourceUrl || undefined,
      actionSource: "website",
      userData: {
        clientIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        clientUserAgent: req.headers.get("user-agent") || null,
        fbp,
        fbc,
      },
      customData: {
        value,
        currency,
        content_type: "product",
        content_ids: variantId ? [variantId] : [],
        content_name: productName,
        num_items: numItems,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[track/add-to-cart] error:", msg);
    return NextResponse.json({ success: false, error: msg });
  }
}
