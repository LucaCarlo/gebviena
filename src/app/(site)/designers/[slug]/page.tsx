import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getCurrentLang, DEFAULT_LANG } from "@/lib/i18n";
import { mergeFirstTranslation, TRANSLATABLE_FIELDS } from "@/lib/translate-payload";

interface PageProps {
  params: { slug: string };
}

async function resolveDesignerId(slug: string, lang: string): Promise<string | null> {
  if (lang !== DEFAULT_LANG) {
    const tr = await prisma.designerTranslation.findFirst({
      where: { languageCode: lang, slug },
      select: { designerId: true },
    });
    if (tr) return tr.designerId;
  }
  const d = await prisma.designer.findUnique({ where: { slug }, select: { id: true } });
  return d?.id ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const lang = getCurrentLang();
  const designerId = await resolveDesignerId(params.slug, lang);
  if (!designerId) return { title: "Designer non trovato" };

  const includeTranslations = lang !== DEFAULT_LANG;
  const raw = await prisma.designer.findUnique({
    where: { id: designerId },
    select: {
      name: true,
      seoTitle: true,
      seoDescription: true,
      ...(includeTranslations
        ? {
            translations: {
              where: { languageCode: lang },
              select: { name: true, seoTitle: true, seoDescription: true },
            },
          }
        : {}),
    },
  });

  if (!raw) return { title: "Designer non trovato" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = includeTranslations
    ? mergeFirstTranslation(raw as Record<string, unknown>, ["name", "seoTitle", "seoDescription"])
    : raw;

  return {
    title: d.seoTitle || `${d.name} | Gebrüder Thonet Vienna`,
    description:
      d.seoDescription ||
      `Scopri i prodotti disegnati da ${d.name} per GTV.`,
  };
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const lang = getCurrentLang();
  const includeTranslations = lang !== DEFAULT_LANG;
  const designerId = await resolveDesignerId(params.slug, lang);
  if (!designerId) notFound();

  const rawDesigner = await prisma.designer.findUnique({
    where: { id: designerId },
    ...(includeTranslations
      ? { include: { translations: { where: { languageCode: lang } } } }
      : {}),
  });

  if (!rawDesigner || !rawDesigner.isActive) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const designer: any = includeTranslations
    ? mergeFirstTranslation(rawDesigner as unknown as Record<string, unknown>, TRANSLATABLE_FIELDS.designer)
    : rawDesigner;

  const rawProducts = await prisma.product.findMany({
    where: { designerId: designer.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      coverImage: true,
      imageUrl: true,
      ...(includeTranslations
        ? {
            translations: {
              where: { languageCode: lang },
              select: { name: true, slug: true },
            },
          }
        : {}),
    },
  });

  const products = includeTranslations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawProducts as any[]).map((p) => mergeFirstTranslation(p, ["name", "slug"]))
    : rawProducts;

  return (
    <>
      {/* ── Titolo Designer ────────────────────────────────────────── */}
      <section className="pt-16 md:pt-24 lg:pt-32 pb-12 md:pb-16">
        <div className="mx-auto w-[90%] max-w-[75%] text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-dark leading-[1.2] tracking-tight">
            {designer.name}
          </h1>
        </div>
      </section>

      {/* ── Bio: immagine sx + testo dx ────────────────────────────── */}
      {(designer.imageUrl || designer.bio) && (
        <section className="pb-20 md:pb-28">
          <div className="mx-auto w-[90%] max-w-[75%]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              {/* Left: foto designer */}
              <div className="relative aspect-square bg-warm-100 overflow-hidden">
                {designer.imageUrl ? (
                  <Image
                    src={designer.imageUrl}
                    alt={designer.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 35vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-serif text-8xl text-warm-300">
                      {designer.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: biografia */}
              <div>
                {designer.bio && (
                  <div
                    className="text-lg text-dark leading-[1.8] font-light prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: designer.bio }}
                  />
                )}
                {designer.website && (
                  <a
                    href={designer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-6 text-[16px] uppercase tracking-[0.03em] font-medium text-dark hover:text-warm-600 hover:underline transition-colors"
                  >
                    Visita il sito →
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Prodotti ───────────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="pb-20 md:pb-28">
          <div className="mx-auto w-[90%] max-w-[75%]">
            <p className="label-text mb-10 text-center">Prodotti</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => {
                const imgSrc =
                  product!.coverImage || product!.imageUrl || null;
                return (
                  <Link
                    key={product!.id}
                    href={`/prodotti/${product!.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square bg-warm-50 overflow-hidden mb-4">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={product!.name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-serif text-4xl text-warm-300">
                            {product!.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-warm-500 mb-1">
                      {(product!.category || "").split(",")[0]}
                    </p>
                    <p className="font-sans text-sm md:text-base uppercase tracking-[0.1em] text-dark font-medium">
                      {product!.name}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Breadcrumbs ───────────────────────────────────────────── */}
      <div className="gtv-container pb-12">
        <nav className="flex items-center gap-2 text-xs text-warm-400">
          <Link href="/" className="hover:text-warm-800 transition-colors">
            Home
          </Link>
          <span>&gt;</span>
          <Link
            href="/mondo-gtv"
            className="hover:text-warm-800 transition-colors"
          >
            Mondo GTV
          </Link>
          <span>&gt;</span>
          <Link
            href="/mondo-gtv/designer-e-premi"
            className="hover:text-warm-800 transition-colors"
          >
            Designer e premi
          </Link>
          <span>&gt;</span>
          <span className="text-warm-600">{designer.name}</span>
        </nav>
      </div>
    </>
  );
}
