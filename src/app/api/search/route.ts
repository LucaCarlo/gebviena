import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryLabelMap } from "@/lib/server-categories";
import { lookupLabel } from "@/lib/category-lookup";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const [products, projects, designers, campaigns, awards] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { designerName: { contains: q } },
            { category: { contains: q } },
            { subcategory: { contains: q } },
            { description: { contains: q } },
            { materials: { contains: q } },
          ],
        },
        select: { name: true, slug: true, category: true, coverImage: true, imageUrl: true, designerName: true },
        take: 8,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.project.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { type: { contains: q } },
            { country: { contains: q } },
            { city: { contains: q } },
            { architect: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: { name: true, slug: true, type: true, imageUrl: true, country: true },
        take: 6,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.designer.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { country: { contains: q } },
            { bio: { contains: q } },
          ],
        },
        select: { name: true, slug: true, imageUrl: true, country: true },
        take: 4,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.campaign.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: { name: true, slug: true, type: true, imageUrl: true },
        take: 4,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.award.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q } },
            { organization: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          year: true,
          organization: true,
          imageUrl: true,
          productName: true,
          products: { select: { product: { select: { name: true } } } },
        },
        take: 4,
        orderBy: { year: "desc" },
      }),
    ]);

    const productCatMap = await getCategoryLabelMap("product");

    const results: Array<{
      type: string;
      typeLabel: string;
      name: string;
      url: string;
      image: string | null;
      subtitle: string | null;
    }> = [];

    for (const p of products) {
      const firstCat = (p.category || "").split(",").map((s) => s.trim()).filter(Boolean)[0] || "";
      const catLabel = firstCat ? lookupLabel(productCatMap, firstCat) : "";
      results.push({
        type: "product",
        typeLabel: "Prodotto",
        name: p.name,
        url: `/prodotti/${p.slug}`,
        image: p.coverImage || p.imageUrl || null,
        subtitle: [catLabel, p.designerName].filter(Boolean).join(" — "),
      });
    }

    for (const p of projects) {
      results.push({
        type: "project",
        typeLabel: "Progetto",
        name: p.name,
        url: `/progetti`,
        image: p.imageUrl || null,
        subtitle: [p.type?.replace(/_/g, " "), p.country].filter(Boolean).join(" — "),
      });
    }

    for (const d of designers) {
      results.push({
        type: "designer",
        typeLabel: "Designer",
        name: d.name,
        url: `/mondo-gtv`,
        image: d.imageUrl || null,
        subtitle: d.country || null,
      });
    }

    for (const c of campaigns) {
      results.push({
        type: "campaign",
        typeLabel: "Campagna",
        name: c.name,
        url: `/mondo-gtv`,
        image: c.imageUrl || null,
        subtitle: c.type || null,
      });
    }

    for (const a of awards) {
      const productNames = a.products.map((ap) => ap.product.name).filter(Boolean);
      if (productNames.length === 0 && a.productName) productNames.push(a.productName);
      results.push({
        type: "award",
        typeLabel: "Premio",
        name: a.name,
        url: `/mondo-gtv`,
        image: a.imageUrl || null,
        subtitle: productNames.length > 0 ? productNames.join(", ") : null,
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ success: false, error: "Errore nella ricerca" }, { status: 500 });
  }
}
