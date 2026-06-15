import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/fb-capi";

export const dynamic = "force-dynamic";

/**
 * Endpoint pubblico tracking — ViewContent server-side gemello dell'evento
 * pixel firato sull'apertura della pagina prodotto. Stesso eventID del pixel
 * → Meta dedupa.
 *
 * Body: { eventID, content_ids: string[], content_name?, value?, currency? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventID = String(body.eventID || "").trim();
    if (!eventID) {
      return NextResponse.json({ success: false, error: "eventID mancante" }, { status: 400 });
    }

    const contentIds = Array.isArray(body.content_ids) ? body.content_ids.filter((x: unknown): x is string => typeof x === "string") : [];
    const contentName = typeof body.content_name === "string" ? body.content_name : undefined;
    const value = Number.isFinite(body.value) ? body.value : 0;
    const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "EUR";

    const cookieHeader = req.headers.get("cookie") || "";
    const fbp = cookieHeader.match(/(?:^|; )_fbp=([^;]+)/)?.[1] || null;
    const fbc = cookieHeader.match(/(?:^|; )_fbc=([^;]+)/)?.[1] || null;

    await sendCapiEvent({
      eventName: "ViewContent",
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
        content_name: contentName,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[track/view-content] error:", msg);
    return NextResponse.json({ success: false, error: msg });
  }
}
