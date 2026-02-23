import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const featured = searchParams.get("featured");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");

  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== "TUTTI") where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (featured === "true") where.isFeatured = true;

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { designer: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    delete body.designer;

    const data = await prisma.product.create({ data: body });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
