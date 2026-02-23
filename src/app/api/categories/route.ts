import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("contentType");
  const typologyId = searchParams.get("typologyId");

  if (!contentType) {
    return NextResponse.json(
      { success: false, error: "contentType is required" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = { contentType };

  if (typologyId) {
    where.typologies = {
      some: { typologyId },
    };
  }

  const data = await prisma.contentCategory.findMany({
    where,
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
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { contentType, value, label, sortOrder, isActive, typologyIds } = body;

    if (!contentType || !value || !label) {
      return NextResponse.json(
        { success: false, error: "contentType, value and label are required" },
        { status: 400 }
      );
    }

    const data = await prisma.contentCategory.create({
      data: {
        contentType,
        value,
        label,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        ...(typologyIds && typologyIds.length > 0
          ? {
              typologies: {
                create: typologyIds.map((typologyId: string) => ({
                  typologyId,
                })),
              },
            }
          : {}),
      },
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

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 400 }
    );
  }
}
