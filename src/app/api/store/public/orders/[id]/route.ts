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
