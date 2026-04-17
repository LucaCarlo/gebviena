import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      designer: true,
      extraDimensions: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

interface ExtraDimensionInput {
  name?: string | null;
  blockId?: string | null;
  values?: string | null;
  freeText?: string | null;
  image?: string | null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("products", "edit");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    delete body.designer;
    if (body.designerId === "") body.designerId = null;

    const extraDimensions: ExtraDimensionInput[] | undefined = body.extraDimensions;
    delete body.extraDimensions;

    const data = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...body,
        ...(Array.isArray(extraDimensions)
          ? {
              extraDimensions: {
                deleteMany: {},
                create: extraDimensions.map((d, i) => ({
                  name: d.name || null,
                  blockId: d.blockId || null,
                  values: d.values || null,
                  freeText: d.freeText || null,
                  image: d.image || null,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      include: { extraDimensions: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("products", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
