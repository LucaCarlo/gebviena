import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.award.findUnique({
    where: { id: params.id },
    include: { products: { select: { productId: true } } },
  });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("awards", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { productIds, ...rest } = body;
    // strip `products` (relation array sent back by GET) before passing to Prisma
    const awardData = { ...rest };
    delete (awardData as Record<string, unknown>).products;
    const data = await prisma.award.update({ where: { id: params.id }, data: awardData });

    if (Array.isArray(productIds)) {
      await prisma.awardProduct.deleteMany({ where: { awardId: params.id } });
      if (productIds.length > 0) {
        await prisma.awardProduct.createMany({
          data: productIds.map((productId: string) => ({ awardId: params.id, productId })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("awards", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.award.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
