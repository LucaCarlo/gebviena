import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get("contentType");

  const where: Record<string, unknown> = {};
  if (contentType) where.contentType = contentType;

  const data = await prisma.contentTypology.findMany({
    where,
    include: {
      categories: {
        include: {
          category: true,
        },
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
    const { contentType, value, label, sortOrder, isActive, imageUrl } = body;

    if (!contentType || !value || !label) {
      return NextResponse.json(
        { success: false, error: "contentType, value and label are required" },
        { status: 400 }
      );
    }

    const data = await prisma.contentTypology.create({
      data: {
        contentType,
        value,
        label,
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        categories: {
          include: {
            category: true,
          },
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
