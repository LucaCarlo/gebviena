import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const CONTENT_TYPE_MAP: Record<string, () => Promise<unknown[]>> = {
  products: () => prisma.product.findMany({ include: { designer: true }, orderBy: { sortOrder: "asc" } }),
  projects: () => prisma.project.findMany({ include: { products: true }, orderBy: { sortOrder: "asc" } }),
  designers: () => prisma.designer.findMany({ orderBy: { sortOrder: "asc" } }),
  campaigns: () => prisma.campaign.findMany({ orderBy: { sortOrder: "asc" } }),
  awards: () => prisma.award.findMany({ orderBy: { year: "desc" } }),
  "hero-slides": () => prisma.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
  stores: () => prisma.pointOfSale.findMany({ where: { type: "STORE" } }),
  agents: () => prisma.pointOfSale.findMany({ where: { type: "AGENT" } }),
};

export async function GET(_req: Request, { params }: { params: { contentType: string } }) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

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
