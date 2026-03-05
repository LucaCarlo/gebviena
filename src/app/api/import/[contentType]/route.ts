import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

async function importProducts(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, designer, projects, createdAt, updatedAt, ...data } = item;
    await prisma.product.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

async function importProjects(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, products, createdAt, updatedAt, ...data } = item;
    await prisma.project.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

async function importDesigners(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, products, createdAt, updatedAt, ...data } = item;
    await prisma.designer.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

async function importCampaigns(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    await prisma.campaign.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

async function importAwards(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    await prisma.award.create({ data });
    count++;
  }
  return count;
}

async function importHeroSlides(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    await prisma.heroSlide.create({ data });
    count++;
  }
  return count;
}

async function importPointsOfSale(items: any[], type: string) {
  let count = 0;
  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    data.type = type;
    await prisma.pointOfSale.create({ data });
    count++;
  }
  return count;
}

async function importNews(items: any[]) {
  let count = 0;
  for (const item of items) {
    const { id, createdAt, updatedAt, ...data } = item;
    await prisma.newsArticle.upsert({
      where: { slug: data.slug },
      update: data,
      create: data,
    });
    count++;
  }
  return count;
}

const IMPORT_MAP: Record<string, (items: any[]) => Promise<number>> = {
  products: importProducts,
  projects: importProjects,
  designers: importDesigners,
  campaigns: importCampaigns,
  awards: importAwards,
  news: importNews,
  "hero-slides": importHeroSlides,
  stores: (items) => importPointsOfSale(items, "STORE"),
  agents: (items) => importPointsOfSale(items, "AGENT"),
};

export async function POST(req: Request, { params }: { params: { contentType: string } }) {
  const result = await requirePermission("import_export", "create");
  if (isErrorResponse(result)) return result;

  const importer = IMPORT_MAP[params.contentType];
  if (!importer) {
    return NextResponse.json({ success: false, error: "Tipo contenuto non valido" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const items = body.data || body;
    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Il campo 'data' deve essere un array" }, { status: 400 });
    }

    const count = await importer(items);
    return NextResponse.json({ success: true, data: { imported: count } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
