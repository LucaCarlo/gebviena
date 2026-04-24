import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_customers", "view");
  if (isErrorResponse(result)) return result;

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { id: true, quantity: true } } },
      },
    },
  });

  if (!customer) return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });

  const lifetimeCents = customer.orders
    .filter((o) => o.status !== "REFUNDED" && o.status !== "CANCELLED")
    .reduce((s, o) => s + o.totalCents, 0);

  return NextResponse.json({
    success: true,
    data: { ...customer, isGuest: !customer.passwordHash, lifetimeCents },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requirePermission("store_customers", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.firstName !== undefined) data.firstName = body.firstName || null;
    if (body.lastName !== undefined) data.lastName = body.lastName || null;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.taxCode !== undefined) data.taxCode = body.taxCode || null;
    if (body.vatNumber !== undefined) data.vatNumber = body.vatNumber || null;
    if (body.sdiCode !== undefined) data.sdiCode = body.sdiCode || null;
    if (body.sdiPec !== undefined) data.sdiPec = body.sdiPec || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body.marketingOptIn === "boolean") data.marketingOptIn = body.marketingOptIn;

    const updated = await prisma.customer.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
