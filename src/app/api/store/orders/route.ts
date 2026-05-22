import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { OrderStatus, Prisma } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED",
  "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
];

// Ordini "finalizzati" = pagati e in lavorazione/spediti/consegnati/post-vendita.
// Il resto (ABANDONED_CHECKOUT, PENDING, PAYMENT_FAILED, CANCELLED) viene mostrato
// nella pagina "Carrelli abbandonati".
const PAID_SCOPE: OrderStatus[] = [
  "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP",
  "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
];
const PENDING_SCOPE: OrderStatus[] = [
  "ABANDONED_CHECKOUT", "PENDING", "PAYMENT_FAILED", "CANCELLED",
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

  const where: Prisma.OrderWhereInput = {};
  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  } else if (scope === "paid") {
    where.status = { in: PAID_SCOPE };
  } else if (scope === "pending") {
    where.status = { in: PENDING_SCOPE };
  }
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { email: { contains: q } },
      { lastName: { contains: q } },
      { firstName: { contains: q } },
    ];
  }
  if (from) where.createdAt = { ...(where.createdAt as object), gte: new Date(from) };
  if (to) where.createdAt = { ...(where.createdAt as object), lte: new Date(to) };

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      items: { select: { id: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ success: true, data: orders });
}
