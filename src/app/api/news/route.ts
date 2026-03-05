import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const admin = searchParams.get("admin") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "16");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (!admin) where.isActive = true;
  if (category && category !== "TUTTI") where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { subtitle: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: admin ? { updatedAt: "desc" } : { sortOrder: "asc" },
    }),
    prisma.newsArticle.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, totalPages: Math.ceil(total / limit), limit },
  });
}

export async function POST(req: Request) {
  const result = await requirePermission("news", "create");
  if (isErrorResponse(result)) return result;

  try {
    const body = await req.json();
    const data = await prisma.newsArticle.create({ data: body });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
