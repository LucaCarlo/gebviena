import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const result = await requirePermission("store_customers", "view");
  if (isErrorResponse(result)) return result;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const hasOrders = req.nextUrl.searchParams.get("hasOrders");
  const take = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("take") || "200"), 1), 500);

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  if (hasOrders === "true") where.orders = { some: {} };
  if (hasOrders === "false") where.orders = { none: {} };

  const customers = await prisma.customer.findMany({
    where,
    include: {
      _count: { select: { orders: true, addresses: true } },
      orders: {
        select: { totalCents: true, currency: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  // Aggrega spesa totale per cliente (in EUR — se currency miste, approssimiamo)
  const data = customers.map((c) => {
    const nonRefunded = c.orders.filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED");
    const lifetimeCents = nonRefunded.reduce((s, o) => s + o.totalCents, 0);
    return {
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      isGuest: !c.passwordHash,
      isActive: c.isActive,
      marketingOptIn: c.marketingOptIn,
      createdAt: c.createdAt,
      lastLoginAt: c.lastLoginAt,
      ordersCount: c._count.orders,
      addressesCount: c._count.addresses,
      lifetimeCents,
      currency: c.orders[0]?.currency || "EUR",
    };
  });

  return NextResponse.json({ success: true, data });
}
