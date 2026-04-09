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
    },
  });

  if (!data) {
    return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
  }

  // Fetch related products (same primary typology, excluding current)
  const primaryTypology = data.category?.split(",")[0] || data.category;
  const related = await prisma.product.findMany({
    where: { category: { contains: primaryTypology }, id: { not: data.id }, isActive: true },
    take: 4,
    include: { designer: true },
  });

  // Fetch projects that actually use this product
  const projectLinks = await prisma.projectProduct.findMany({
    where: { productId: data.id },
    include: { project: true },
    take: 4,
  });
  const projects = projectLinks
    .map((pp) => pp.project)
    .filter((p) => p.isActive);

  return NextResponse.json({
    success: true,
    data: { ...data, related, projects },
  });
}
