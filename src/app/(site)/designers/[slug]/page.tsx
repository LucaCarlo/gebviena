import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const designer = await prisma.designer.findUnique({
    where: { slug: params.slug },
    select: { name: true, seoTitle: true, seoDescription: true },
  });

  if (!designer) return { title: "Designer non trovato" };

  return {
    title: designer.seoTitle || `${designer.name} | Gebrüder Thonet Vienna`,
    description:
      designer.seoDescription ||
      `Scopri i prodotti disegnati da ${designer.name} per GTV.`,
  };
}

export default async function DesignerDetailPage({ params }: PageProps) {
  const designer = await prisma.designer.findUnique({
    where: { slug: params.slug },
  });

  if (!designer || !designer.isActive) notFound();

  const products = await prisma.product.findMany({
    where: { designerId: designer.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      coverImage: true,
      imageUrl: true,
    },
  });

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
                    className="inline-block mt-6 text-sm uppercase tracking-[0.15em] font-light text-dark hover:text-warm-600 transition-colors"
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
                  product.coverImage || product.imageUrl || null;
                return (
                  <Link
                    key={product.id}
                    href={`/prodotti/${product.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square bg-warm-50 overflow-hidden mb-4">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={product.name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-serif text-4xl text-warm-300">
                            {product.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-warm-500 mb-1">
                      {(product.category || "").split(",")[0]}
                    </p>
                    <p className="font-sans text-sm md:text-base uppercase tracking-[0.1em] text-dark font-medium">
                      {product.name}
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
