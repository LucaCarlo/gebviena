import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      products: { include: { product: true } },
    },
  });
  if (!data) {
    return NextResponse.json({ success: false, error: "Non trovato" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const permResult = await requirePermission("projects", "edit");
  if (isErrorResponse(permResult)) return permResult;

  try {
    const body = await req.json();
    const { productIds, ...projectData } = body;

    await prisma.project.update({
      where: { id: params.id },
      data: projectData,
    });

    if (Array.isArray(productIds)) {
      // Delete all existing ProjectProduct for this project
      await prisma.projectProduct.deleteMany({
        where: { projectId: params.id },
      });

      // Recreate with new productIds
      if (productIds.length > 0) {
        await prisma.projectProduct.createMany({
          data: productIds.map((productId: string) => ({
            projectId: params.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const result = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        products: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const result = await requirePermission("projects", "delete");
  if (isErrorResponse(result)) return result;

  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
