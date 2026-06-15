import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/fb-capi";

export const dynamic = "force-dynamic";

/**
 * Endpoint pubblico tracking — InitiateCheckout server-side gemello
 * dell'evento pixel firato al mount di /store/checkout. Il client passa
 * `eventID` (lo stesso che usa per fbq) e i dettagli minimi del carrello;
 * il server invia un evento CAPI con event_id condiviso, così Meta dedupa.
 *
 * NON THROW: il tracking non deve mai bloccare l'utente. In caso di errore
 * silent fallthrough con 200 OK e success=false.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventID = String(body.eventID || "").trim();
    if (!eventID) {
      return NextResponse.json({ success: false, error: "eventID mancante" }, { status: 400 });
    }

    const contentIds = Array.isArray(body.content_ids) ? body.content_ids.filter((x: unknown): x is string => typeof x === "string") : [];
    const numItems = Number.isFinite(body.num_items) ? Math.max(0, Math.trunc(body.num_items)) : 0;
    const value = Number.isFinite(body.value) ? body.value : 0;
    const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "EUR";

    // Estrai cookies _fbp/_fbc per migliorare il match Meta.
    const cookieHeader = req.headers.get("cookie") || "";
    const fbp = cookieHeader.match(/(?:^|; )_fbp=([^;]+)/)?.[1] || null;
    const fbc = cookieHeader.match(/(?:^|; )_fbc=([^;]+)/)?.[1] || null;

    // Per evitare bloccare il client, fire-and-forget (await comunque per
    // riportare success/error nel response, ma errori sono già catchati).
    await sendCapiEvent({
      eventName: "InitiateCheckout",
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
        content_ids: contentIds,
        num_items: numItems,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[track/initiate-checkout] error:", msg);
    return NextResponse.json({ success: false, error: msg });
  }
}
