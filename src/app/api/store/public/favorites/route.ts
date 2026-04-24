import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "it";

  const favorites = await prisma.customerFavorite.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      storeProduct: {
        include: {
          product: {
            include: {
              translations: {
                where: { languageCode: lang },
                select: { name: true, slug: true },
              },
            },
          },
          translations: {
            where: { languageCode: lang },
            select: { name: true, slug: true, shortDescription: true },
          },
          variants: {
            select: { priceCents: true, stockQty: true, trackStock: true },
            orderBy: { priceCents: "asc" },
          },
        },
      },
    },
  });

  const data = favorites.map((f) => {
    const sp = f.storeProduct;
    const tr = sp.translations[0];
    const prodTr = sp.product.translations[0];
    const name = tr?.name || prodTr?.name || "";
    const slug = tr?.slug || prodTr?.slug || sp.id;
    const priceFromCents = sp.variants[0]?.priceCents ?? 0;
    const inStock = sp.variants.some((v) => !v.trackStock || (v.stockQty ?? 0) > 0);
    return {
      id: f.id,
      favoritedAt: f.createdAt,
      storeProductId: sp.id,
      slug,
      name,
      shortDescription: tr?.shortDescription || null,
      coverImage: sp.coverImage,
      priceFromCents,
      variantsCount: sp.variants.length,
      inStock,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }
  try {
    const { storeProductId } = await req.json();
    if (!storeProductId) {
      return NextResponse.json({ success: false, error: "Prodotto mancante" }, { status: 400 });
    }
    const exists = await prisma.storeProduct.findUnique({ where: { id: String(storeProductId) } });
    if (!exists) {
      return NextResponse.json({ success: false, error: "Prodotto non trovato" }, { status: 404 });
    }
    const fav = await prisma.customerFavorite.upsert({
      where: { customerId_storeProductId: { customerId: customer.id, storeProductId: String(storeProductId) } },
      create: { customerId: customer.id, storeProductId: String(storeProductId) },
      update: {},
    });
    return NextResponse.json({ success: true, data: fav });
  } catch (e) {
    console.error("Add favorite error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const customer = await getAuthCustomer();
  if (!customer) {
    return NextResponse.json({ success: false, error: "Non autenticato" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const storeProductId = searchParams.get("storeProductId");
    if (!storeProductId) {
      return NextResponse.json({ success: false, error: "Prodotto mancante" }, { status: 400 });
    }
    await prisma.customerFavorite.deleteMany({
      where: { customerId: customer.id, storeProductId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Remove favorite error:", e);
    return NextResponse.json({ success: false, error: "Errore server" }, { status: 500 });
  }
}
