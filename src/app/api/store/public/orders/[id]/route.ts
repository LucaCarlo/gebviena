import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, customerId: customer.id },
    include: {
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: order });
}

// Il cliente può eliminare dalla propria area solo i carrelli abbandonati
// (checkout non completato / pagamento fallito). Gli ordini reali restano.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, customerId: customer.id },
    select: { id: true, status: true, paymentProvider: true },
  });
  if (!order) {
    return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
  }

  const isAbandonedCart =
    order.status === "ABANDONED_CHECKOUT" ||
    order.status === "PAYMENT_FAILED" ||
    (order.status === "PENDING" && order.paymentProvider !== "bonifico");

  if (!isAbandonedCart) {
    return NextResponse.json(
      { success: false, error: "Questo ordine non può essere eliminato" },
      { status: 400 }
    );
  }

  await prisma.order.delete({ where: { id: order.id } });
  return NextResponse.json({ success: true });
}
