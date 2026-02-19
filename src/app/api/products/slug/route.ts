import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "Slug richiesto" }, { status: 400 });
  }

  const data = await prisma.product.findUnique({
    where: { slug },
    include: {
      designer: true,
      finishes: { include: { finish: true } },
    },
  });

  if (!data) {
    return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
  }

  // Fetch related products (same category, excluding current)
  const related = await prisma.product.findMany({
    where: { category: data.category, id: { not: data.id }, isActive: true },
    take: 4,
    include: { designer: true },
  });

  // Fetch all finishes grouped by category
  const allFinishes = await prisma.finish.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  // Fetch a random project for the "project reference" section
  const projectCount = await prisma.project.count({ where: { isActive: true } });
  const randomSkip = Math.floor(Math.random() * Math.max(projectCount, 1));
  const project = await prisma.project.findFirst({
    where: { isActive: true },
    skip: randomSkip,
  });

  return NextResponse.json({
    success: true,
    data: { ...data, related, allFinishes, project },
  });
}
