import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Lista dei carrelli abbandonati lato admin.
 * Default: tutti i Cart con itemCount > 0 e converted=false,
 * ordinati per updatedAt desc, paginati.
 *
 * Query params:
 *   page (default 1), pageSize (default 30)
 *   q (filtro email/sku/productSlug substring)
 *   minAgeMin (default 0) — esclude i carrelli aggiornati negli ultimi N minuti
 *     (es. minAgeMin=30 = "considera abbandonato solo se non lo toccano da 30 min")
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission("store_orders", "view");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "30", 10)));
  const q = (url.searchParams.get("q") || "").trim();
  const minAgeMin = Math.max(0, parseInt(url.searchParams.get("minAgeMin") || "0", 10));

  const cutoff = minAgeMin > 0 ? new Date(Date.now() - minAgeMin * 60_000) : null;

  const where: Record<string, unknown> = {
    converted: false,
    itemCount: { gt: 0 },
  };
  if (cutoff) (where as { updatedAt?: unknown }).updatedAt = { lt: cutoff };
  if (q) {
    (where as { OR?: unknown[] }).OR = [
      { email: { contains: q } },
      { items: { contains: q } },
      { sessionId: { contains: q } },
    ];
  }

  const [total, rows, stats] = await Promise.all([
    prisma.cart.count({ where }),
    prisma.cart.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sessionId: true,
        email: true,
        customerId: true,
        items: true,
        subtotalCents: true,
        itemCount: true,
        currency: true,
        language: true,
        ipAddress: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.cart.aggregate({
      where: { converted: false, itemCount: { gt: 0 } },
      _count: true,
      _sum: { subtotalCents: true },
    }),
  ]);

  // Parse items (snapshot JSON) e fornisce un piccolo summary per UI tabella
  const data = rows.map((r) => {
    let parsedItems: Array<{ productName?: string; productSlug?: string; sku?: string; quantity?: number; priceCents?: number; coverImage?: string | null }> = [];
    try {
      parsedItems = JSON.parse(r.items);
      if (!Array.isArray(parsedItems)) parsedItems = [];
    } catch { /* */ }
    return {
      id: r.id,
      sessionId: r.sessionId,
      email: r.email,
      customerId: r.customerId,
      itemCount: r.itemCount,
      subtotalCents: r.subtotalCents,
      currency: r.currency,
      language: r.language,
      ipAddress: r.ipAddress,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
      items: parsedItems.map((it) => ({
        productName: it.productName || "",
        productSlug: it.productSlug || "",
        sku: it.sku || "",
        quantity: Number(it.quantity || 0),
        priceCents: Number(it.priceCents || 0),
        coverImage: it.coverImage || null,
      })),
    };
  });

  return NextResponse.json({
    success: true,
    data,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    stats: {
      totalCarts: stats._count || 0,
      totalValueCents: stats._sum.subtotalCents || 0,
    },
  });
}

/**
 * DELETE singolo carrello (cleanup admin).
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission("store_orders", "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ success: false, error: "id mancante" }, { status: 400 });

  await prisma.cart.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
