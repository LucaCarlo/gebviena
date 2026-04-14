import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET() {
  const data = await prisma.award.findMany({
    orderBy: { year: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const result = await requirePermission("awards", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const { productIds, ...awardData } = body;
    const data = await prisma.award.create({ data: awardData });

    if (Array.isArray(productIds) && productIds.length > 0) {
      await prisma.awardProduct.createMany({
        data: productIds.map((productId: string) => ({ awardId: data.id, productId })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
