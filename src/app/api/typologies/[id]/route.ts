import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = await prisma.contentTypology.findUnique({
    where: { id: params.id },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
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
    const { categoryIds, ...updateData } = body;

    // Only include allowed fields
    const fields: Record<string, unknown> = {};
    if (updateData.value !== undefined) fields.value = updateData.value;
    if (updateData.label !== undefined) fields.label = updateData.label;
    if (updateData.sortOrder !== undefined) fields.sortOrder = updateData.sortOrder;
    if (updateData.isActive !== undefined) fields.isActive = updateData.isActive;

    const data = await prisma.$transaction(async (tx) => {
      // Update the typology fields
      await tx.contentTypology.update({
        where: { id: params.id },
        data: fields,
      });

      // If categoryIds provided, replace all category associations
      if (Array.isArray(categoryIds)) {
        await tx.contentTypologyCategory.deleteMany({
          where: { typologyId: params.id },
        });

        if (categoryIds.length > 0) {
          await tx.contentTypologyCategory.createMany({
            data: categoryIds.map((categoryId: string) => ({
              typologyId: params.id,
              categoryId,
            })),
          });
        }
      }

      // Return updated typology with categories
      return tx.contentTypology.findUnique({
        where: { id: params.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      });
    });

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

  try {
    await prisma.contentTypology.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
