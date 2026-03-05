import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }

  const data = await prisma.newsArticle.findUnique({ where: { slug } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Articolo non trovato" }, { status: 404 });
  }

  const related = await prisma.newsArticle.findMany({
    where: {
      id: { not: data.id },
      isActive: true,
    },
    take: 4,
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: { ...data, related } });
}
