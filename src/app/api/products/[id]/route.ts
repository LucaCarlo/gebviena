import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.product.findUnique({
    where: { id: params.id },
    include: { designer: true, finishes: { include: { finish: true } } },
  });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { finishIds, ...rest } = body;
    // Remove relation fields that Prisma doesn't accept on update
    delete rest.designer;
    delete rest.finishes;

    const data = await prisma.product.update({ where: { id: params.id }, data: rest });

    // Update finish associations if provided
    if (finishIds && Array.isArray(finishIds)) {
      // Delete existing associations
      await prisma.productFinish.deleteMany({ where: { productId: params.id } });
      // Create new ones
      if (finishIds.length > 0) {
        await prisma.productFinish.createMany({
          data: finishIds.map((finishId: string) => ({
            productId: params.id,
            finishId,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
