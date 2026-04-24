import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { OrderStatus, Prisma } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
];

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_orders", "view");
  if (isErrorResponse(result)) return result;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as OrderStatus | null;
  const q = (sp.get("q") || "").trim();
  const from = sp.get("from");
  const to = sp.get("to");
  const take = Math.min(Math.max(parseInt(sp.get("take") || "100"), 1), 500);

  const where: Prisma.OrderWhereInput = {};
  if (status && VALID_STATUSES.includes(status)) where.status = status;
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
