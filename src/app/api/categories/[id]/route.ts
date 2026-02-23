import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const data = await prisma.contentCategory.findUnique({
    where: { id: params.id },
    include: {
      typologies: {
        include: {
          typology: true,
        },
      },
      subcategories: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!data) {
    return NextResponse.json(
      { success: false, error: "Non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { typologyIds, ...updateData } = body;

    const data = await prisma.$transaction(async (tx) => {
      // Update the category fields
      await tx.contentCategory.update({
        where: { id: params.id },
        data: updateData,
      });

      // If typologyIds provided, replace all associations
      if (typologyIds !== undefined) {
        await tx.contentTypologyCategory.deleteMany({
          where: { categoryId: params.id },
        });

        if (Array.isArray(typologyIds) && typologyIds.length > 0) {
          await tx.contentTypologyCategory.createMany({
            data: typologyIds.map((typologyId: string) => ({
              typologyId,
              categoryId: params.id,
            })),
          });
        }
      }

      // Return the updated category with relations
      return tx.contentCategory.findUnique({
        where: { id: params.id },
        include: {
          typologies: {
            include: {
              typology: true,
            },
          },
          subcategories: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  await prisma.contentCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
