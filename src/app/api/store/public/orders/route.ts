import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      currency: true,
      trackingNumber: true,
      trackingCarrier: true,
      trackingUrl: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          quantity: true,
          totalCents: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: orders });
}
