import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, isErrorResponse } from "@/lib/permissions";

const CONTENT_TYPE_MAP: Record<string, () => Promise<unknown[]>> = {
  products: () => prisma.product.findMany({ include: { designer: true }, orderBy: { sortOrder: "asc" } }),
  projects: () => prisma.project.findMany({ include: { products: true }, orderBy: { sortOrder: "asc" } }),
  designers: () => prisma.designer.findMany({ orderBy: { sortOrder: "asc" } }),
  campaigns: () => prisma.campaign.findMany({ orderBy: { sortOrder: "asc" } }),
  awards: () => prisma.award.findMany({ orderBy: { year: "desc" } }),
  news: () => prisma.newsArticle.findMany({ orderBy: { sortOrder: "asc" } }),
  "hero-slides": () => prisma.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
  stores: () => prisma.pointOfSale.findMany({ where: { type: "STORE" } }),
  agents: () => prisma.pointOfSale.findMany({ where: { type: "AGENT" } }),
};

export async function GET(_req: Request, { params }: { params: { contentType: string } }) {
  const result = await requirePermission("import_export", "view");
  if (isErrorResponse(result)) return result;

  const fetcher = CONTENT_TYPE_MAP[params.contentType];
  if (!fetcher) {
    return NextResponse.json({ success: false, error: "Tipo contenuto non valido" }, { status: 400 });
  }

  try {
    const data = await fetcher();
    return NextResponse.json({ success: true, data, meta: { contentType: params.contentType, count: data.length, exportedAt: new Date().toISOString() } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
