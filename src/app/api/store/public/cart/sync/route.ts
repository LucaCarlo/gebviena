import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Sync del carrello del browser → DB Cart (per tracciare i "carrelli abbandonati").
 * Idempotente per sessionId (UUID v4 generato lato client e persistito in localStorage).
 *
 * Body:
 *   { sessionId, items: [...], subtotalCents?, email?, customerId?, currency?, language? }
 *
 * Se items è array vuoto e il cart esiste già, viene cancellato.
 * Se converted=true viene impostato (chiamato dopo checkout success).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").trim().slice(0, 64);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId mancante" }, { status: 400 });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const subtotalCents = Number.isFinite(body.subtotalCents) ? Math.max(0, Math.trunc(body.subtotalCents)) : 0;
    const itemCount = items.reduce((acc: number, it: { quantity?: number }) => acc + Math.max(0, Math.trunc(it.quantity || 0)), 0);
    const currency = String(body.currency || "EUR").toUpperCase().slice(0, 3);
    const language = body.language ? String(body.language).slice(0, 8) : null;
    const email = body.email ? String(body.email).trim().slice(0, 191) : null;
    const customerId = body.customerId ? String(body.customerId).slice(0, 191) : null;
    const converted = body.converted === true;
    const convertedOrderId = body.convertedOrderId ? String(body.convertedOrderId).slice(0, 191) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
    const xff = req.headers.get("x-forwarded-for") || "";
    const ipAddress = xff.split(",")[0]?.trim().slice(0, 64) || null;

    // Cart vuoto + non convertito → cancella la riga se esiste (no clutter).
    if (items.length === 0 && !converted) {
      await prisma.cart.deleteMany({ where: { sessionId } }).catch(() => { /* ignore */ });
      return NextResponse.json({ success: true, data: { deleted: true } });
    }

    const itemsJson = JSON.stringify(items).slice(0, 65535); // protezione TEXT col limit
    const data = {
      sessionId,
      customerId,
      email,
      items: itemsJson,
      subtotalCents,
      currency,
      itemCount,
      language,
      userAgent,
      ipAddress,
      converted,
      convertedOrderId,
    };

    await prisma.cart.upsert({
      where: { sessionId },
      update: {
        customerId: customerId ?? undefined,
        email: email ?? undefined,
        items: itemsJson,
        subtotalCents,
        currency,
        itemCount,
        language: language ?? undefined,
        userAgent: userAgent ?? undefined,
        ipAddress: ipAddress ?? undefined,
        converted,
        convertedOrderId: convertedOrderId ?? undefined,
      },
      create: data,
    });

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cart/sync] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
