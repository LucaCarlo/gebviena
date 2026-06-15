import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";
import { sendCapiPurchase } from "@/lib/fb-capi";
import { OrderStatus } from "@prisma/client";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED", "PAID",
  "PROCESSING", "SHIPPED", "DELIVERED", "PICKED_UP", "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED",
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

    // Snapshot pre-update per detection di transizione → PAID
    const prev = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    const updated = await prisma.order.update({
      where: { id: params.id },
      data,
      include: { customer: true, items: true },
    });

    // Meta CAPI: se l'ordine è appena passato a PAID, invia Purchase server-side.
    // Vale per ordini bonifico marcati PAID manualmente dall'admin (Stripe usa il webhook).
    if (body.status === "PAID" && prev?.status !== "PAID") {
      sendCapiPurchase(updated.id, req).catch((err) => {
        console.error("[orders PUT] sendCapiPurchase error:", err);
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Eliminabili solo i carrelli abbandonati (situazioni pre-pagamento). Gli ordini
// finalizzati (pagati, spediti, annullati, bonifico in attesa…) NON vanno cancellati.
function isAbandonedCart(o: { status: OrderStatus; paymentProvider: string | null }): boolean {
  return (
    o.status === "ABANDONED_CHECKOUT" ||
    o.status === "PAYMENT_FAILED" ||
    (o.status === "PENDING" && o.paymentProvider !== "bonifico")
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_orders", "delete");
  if (isErrorResponse(result)) return result;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { status: true, paymentProvider: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  }
  if (!isAbandonedCart(order)) {
    return NextResponse.json(
      { success: false, error: "Solo i carrelli abbandonati possono essere eliminati" },
      { status: 400 }
    );
  }

  // OrderItem ha onDelete: Cascade → vengono rimossi automaticamente.
  await prisma.order.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
