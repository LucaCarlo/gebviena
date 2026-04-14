import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";
import { buildAlternates } from "@/lib/seo-alternates";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const lang = getCurrentLang();
  let productId: string | null = null;

  if (lang !== DEFAULT_LANG) {
    const tr = await prisma.productTranslation.findFirst({
      where: { languageCode: lang, slug: params.slug },
      select: { productId: true },
    });
    if (tr) productId = tr.productId;
  }
  if (!productId) {
    const p = await prisma.product.findUnique({ where: { slug: params.slug }, select: { id: true } });
    productId = p?.id ?? null;
  }
  if (!productId) return { title: "Prodotto non trovato" };

  const raw = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      coverImage: true,
      translations: { select: { languageCode: true, slug: true, name: true, seoTitle: true, seoDescription: true } },
    },
  });
  if (!raw) return { title: "Prodotto non trovato" };

  const tForLang = raw.translations.find((t) => t.languageCode === lang);
  const seoTitle = (tForLang?.seoTitle?.trim() || raw.seoTitle?.trim() || `${tForLang?.name || raw.name} | Gebrüder Thonet Vienna`);
  const seoDescription = tForLang?.seoDescription?.trim() || raw.seoDescription?.trim() || undefined;

  // Build slug map per lang for alternates
  const slugByLang: Record<string, string> = { [DEFAULT_LANG]: raw.slug };
  for (const t of raw.translations) if (t.slug) slugByLang[t.languageCode] = t.slug;

  const alternates = await buildAlternates(`/prodotti/${raw.slug}`, slugByLang);

  return {
    title: seoTitle,
    description: seoDescription,
    alternates,
    openGraph: { title: seoTitle, description: seoDescription, images: raw.coverImage ? [raw.coverImage] : undefined },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
