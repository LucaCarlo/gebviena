import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { OrderStatus } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_orders", "view");
  if (isErrorResponse(result)) return result;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            include: {
              storeProduct: { include: { product: { select: { name: true, slug: true } } } },
            },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_orders", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: "Stato non valido" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "SHIPPED" && !body.shippedAt) data.shippedAt = new Date();
      if (body.status === "DELIVERED" && !body.deliveredAt) data.deliveredAt = new Date();
      if (body.status === "PAID" && !body.paidAt) data.paidAt = new Date();
    }

    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null;
    if (body.trackingCarrier !== undefined) data.trackingCarrier = body.trackingCarrier || null;
    if (body.trackingUrl !== undefined) data.trackingUrl = body.trackingUrl || null;
    if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes || null;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data,
      include: { customer: true, items: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
