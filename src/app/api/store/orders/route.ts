import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { OrderStatus, Prisma } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED",
  "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
];

// Ordini "finalizzati" = pagati / spediti / completati / post-vendita / annullati
// (CANCELLED presuppone un ordine creato che il cliente o l'admin ha annullato)
// PIÙ gli ordini PENDING via bonifico (sono finalizzati, aspettano solo l'accredito).
const PAID_SCOPE_STATUSES: OrderStatus[] = [
  "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED",
];
// Carrelli abbandonati = solo le situazioni "pre-pagamento":
// - ABANDONED_CHECKOUT (compilato form ma uscito prima di cliccare paga)
// - PAYMENT_FAILED (Stripe ha rifiutato la carta)
// - PENDING via Stripe (cliente NON ha completato il pagamento sulla pagina Stripe)
const PENDING_SCOPE_STATUSES: OrderStatus[] = [
  "ABANDONED_CHECKOUT", "PAYMENT_FAILED",
];

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_orders", "view");
  if (isErrorResponse(result)) return result;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as OrderStatus | null;
  const scope = sp.get("scope"); // "paid" | "pending" | null
  const q = (sp.get("q") || "").trim();
  const from = sp.get("from");
  const to = sp.get("to");
  const take = Math.min(Math.max(parseInt(sp.get("take") || "100"), 1), 500);

  // Costruiamo le condizioni in AND per non sovrascrivere il where.OR dello scope
  // col where.OR della search.
  const conditions: Prisma.OrderWhereInput[] = [];

  if (status && VALID_STATUSES.includes(status)) {
    conditions.push({ status });
    // Se status=PENDING combinato con scope, applica anche il filtro sul provider:
    // scope=paid → solo bonifico; scope=pending → solo non-bonifico (stripe ecc.).
    if (status === "PENDING" && scope === "paid") {
      conditions.push({ paymentProvider: "bonifico" });
    } else if (status === "PENDING" && scope === "pending") {
      conditions.push({ NOT: { paymentProvider: "bonifico" } });
    }
  } else if (scope === "paid") {
    // PAID_SCOPE_STATUSES OR (PENDING AND paymentProvider="bonifico")
    conditions.push({
      OR: [
        { status: { in: PAID_SCOPE_STATUSES } },
        { status: "PENDING", paymentProvider: "bonifico" },
      ],
    });
  } else if (scope === "pending") {
    // PENDING_SCOPE_STATUSES OR (PENDING AND paymentProvider != "bonifico")
    conditions.push({
      OR: [
        { status: { in: PENDING_SCOPE_STATUSES } },
        { status: "PENDING", NOT: { paymentProvider: "bonifico" } },
      ],
    });
  }
  if (q) {
    conditions.push({
      OR: [
        { orderNumber: { contains: q } },
        { email: { contains: q } },
        { lastName: { contains: q } },
        { firstName: { contains: q } },
      ],
    });
  }
  if (from) conditions.push({ createdAt: { gte: new Date(from) } });
  if (to) conditions.push({ createdAt: { lte: new Date(to) } });

  const where: Prisma.OrderWhereInput = conditions.length ? { AND: conditions } : {};

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      items: { select: { id: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  // Quando l'admin guarda i carrelli abbandonati (scope=pending), per ogni
  // ordine PAYMENT_FAILED cerchiamo eventuali ordini "pagati" con stessa email
  // e stesso totalCents: se esistono, significa che il cliente ha riprovato e
  // pagato — l'ordine fallito è duplicato e si può eliminare in sicurezza.
  type OrderWithDup = (typeof orders)[number] & {
    duplicatePaid?: { id: string; orderNumber: string; status: OrderStatus; createdAt: Date } | null;
  };
  let enriched: OrderWithDup[] = orders;
  if (scope === "pending") {
    const failed = orders.filter((o) => o.status === "PAYMENT_FAILED");
    if (failed.length > 0) {
      const PAID_FOR_MATCH: OrderStatus[] = [
        "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
        "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
      ];
      const matches = await prisma.order.findMany({
        where: {
          status: { in: PAID_FOR_MATCH },
          OR: failed.map((f) => ({ email: f.email, totalCents: f.totalCents })),
        },
        select: { id: true, orderNumber: true, email: true, totalCents: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const matchMap = new Map<string, typeof matches[number]>();
      for (const m of matches) {
        const key = `${m.email}|${m.totalCents}`;
        // Prima occorrenza ordinata (più vecchia) come "principale"
        if (!matchMap.has(key)) matchMap.set(key, m);
      }
      enriched = orders.map((o) => {
        if (o.status !== "PAYMENT_FAILED") return o;
        const m = matchMap.get(`${o.email}|${o.totalCents}`);
        return {
          ...o,
          duplicatePaid: m
            ? { id: m.id, orderNumber: m.orderNumber, status: m.status, createdAt: m.createdAt }
            : null,
        };
      });
    }
  }

  return NextResponse.json({ success: true, data: enriched });
}
