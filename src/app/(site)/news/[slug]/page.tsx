"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Facebook, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import type {
  NewsArticle, NewsBlockV2,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
  NewsImageWithParagraphData, NewsFullwidthBannerData, NewsProductData,
} from "@/types";
import { useLang } from "@/contexts/I18nContext";

interface ArticleWithRelated extends NewsArticle {
  related?: NewsArticle[];
}

interface ProductData {
  id: string; name: string; slug: string; imageUrl: string; coverImage: string | null;
}

function ProductBlock({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductData | null>(null);
  useEffect(() => {
    if (!productId) return;
    fetch(`/api/products/${productId}`).then((r) => r.json()).then((data) => {
      if (data.success) setProduct(data.data);
    }).catch(() => {});
  }, [productId]);
  if (!product) return null;
  return (
    <section className="relative w-full" style={{ height: "90vh" }}>
      <Image src={product.coverImage || product.imageUrl} alt={product.name} fill className="object-cover brightness-[0.45]" sizes="100vw" />
      <div className="absolute top-12 md:top-16 lg:top-20 left-8 md:left-16 lg:left-20 max-w-lg">
        <h2 className="font-sans text-2xl md:text-3xl lg:text-[2.5rem] text-white font-light uppercase tracking-wide leading-snug">{product.name}</h2>
        <Link href={`/prodotti/${product.slug}`} className="inline-flex items-center gap-2 mt-4 md:mt-5 uppercase text-[16px] tracking-[0.03em] font-medium text-white/80 hover:text-white hover:underline transition-colors">
          Scopri il prodotto<span>&rarr;</span>
        </Link>
      </div>
    </section>
  );
}

function ImageWithParagraph({ d }: { d: NewsImageWithParagraphData }) {
  const video = d.videoUrl?.trim();
  if (!d.imageUrl && !d.body && !video) return null;
  const yt = video?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const vimeo = video?.match(/vimeo\.com\/(\d+)/);
  return (
    <section className="gtv-container">
      <div className="mx-auto max-w-[940px] px-6 md:px-16 lg:px-24">
        {(d.imageUrl || video) && (
          <div className="mx-auto max-w-[140px]">
            {video ? (
              yt ? (
                <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                  <iframe src={`https://www.youtube.com/embed/${yt[1]}?rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : vimeo ? (
                <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                  <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <video controls playsInline className="w-full h-auto bg-warm-100">
                  <source src={video} />
                </video>
              )
            ) : (
              <Image src={d.imageUrl} alt="" width={400} height={400} className="w-full h-auto" sizes="140px" />
            )}
          </div>
        )}
        {d.title && (
          <h2 className="font-serif text-[30px] md:text-[38px] text-black tracking-tight font-light leading-[1.2] text-center mt-10" dangerouslySetInnerHTML={{ __html: d.title }} />
        )}
        {d.body && (
          <div className="text-[20px] text-black leading-snug font-light tracking-normal text-center mt-6 [&_p]:mb-4 [&_p:last-child]:mb-0 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: d.body }} />
        )}
      </div>
    </section>
  );
}

function FullwidthBanner({ d }: { d: NewsFullwidthBannerData }) {
  if (!d.imageUrl) return null;
  return (
    <section className="relative w-full" style={{ height: "85vh" }}>
      <Image src={d.imageUrl} alt={d.title || ""} fill className="object-cover brightness-[0.6]" sizes="100vw" />
      <div className="absolute top-14 md:top-18 lg:top-22 left-0 right-0 px-7 md:px-12 lg:px-16 text-left">
        {d.title && (
          <h2 className="font-sans text-2xl md:text-3xl lg:text-[38px] text-white/80 font-light uppercase tracking-[inherit] leading-snug max-w-3xl">
            {d.title}
          </h2>
        )}
        {d.ctaLabel && d.ctaHref && (() => {
          const isPdf = /\.pdf($|\?)/i.test(d.ctaHref);
          return (
            <a
              href={d.ctaHref}
              {...(isPdf ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-medium transition-colors hover:underline"
              style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
            >
              {d.ctaLabel} &rarr;
            </a>
          );
        })()}
      </div>
    </section>
  );
}

function ImageTextBg({ d, title: articleTitle }: { d: NewsImageTextBgData; title: string }) {
  const imgLeft = d.imagePosition === "left";
  const imageEl = (
    <div className="relative bg-warm-200 overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
      {d.imageUrl && <Image src={d.imageUrl} alt={d.title || articleTitle} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />}
    </div>
  );
  const textEl = (
    <div className="flex flex-col justify-center px-8 py-16 md:px-16 md:py-20 lg:px-24 xl:px-[150px] xl:py-[96px]">
      {d.title && (
        <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]" dangerouslySetInnerHTML={{ __html: d.title }} />
      )}
      {d.text && (
        <div className="text-[20px] text-black leading-snug font-light tracking-normal mt-8 [&_p]:mb-4 [&_p:last-child]:mb-0 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: d.text }} />
      )}
      {d.ctaLabel && d.ctaHref && (() => {
        const isPdf = /\.pdf($|\?)/i.test(d.ctaHref);
        return (
          <a
            href={d.ctaHref}
            {...(isPdf ? { download: "", target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-block self-start mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline"
            style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
          >
            {d.ctaLabel}
          </a>
        );
      })()}
    </div>
  );
  return (
    <section className="w-full bg-warm-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0">
        {imgLeft ? <>{imageEl}{textEl}</> : <>{textEl}{imageEl}</>}
      </div>
    </section>
  );
}

function ThreeImages({ d }: { d: NewsThreeImagesData }) {
  const imgs = (d.images || []).filter((i) => i.url);
  if (!imgs.length) return null;
  return (
    <section className="px-2 md:px-3 lg:px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 md:gap-x-4 gap-y-8">
        {imgs.map((img, i) => (
          <div key={i}>
            <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
              <Image src={img.url} alt={img.caption || ""} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            {img.caption && <p className="text-[14px] text-black mt-3 font-light text-center">{img.caption}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function SingleImage({ d }: { d: NewsSingleImageData }) {
  if (!d.imageUrl && !d.videoUrl) return null;
  const video = d.videoUrl?.trim();
  const yt = video?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const vimeo = video?.match(/vimeo\.com\/(\d+)/);
  return (
    <section className="gtv-container">
      <div className="mx-auto max-w-[940px]">
        {video ? (
          yt ? (
            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
              <iframe src={`https://www.youtube.com/embed/${yt[1]}?rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : vimeo ? (
            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
              <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <video controls playsInline className="w-full h-auto bg-warm-100">
              <source src={video} />
            </video>
          )
        ) : (
          <Image src={d.imageUrl} alt={d.caption || ""} width={1600} height={1000} className="w-full h-auto" sizes="(max-width: 940px) 100vw, 940px" />
        )}
        {d.caption && <p className="text-[14px] text-black mt-3 font-light text-center">{d.caption}</p>}
      </div>
    </section>
  );
}

function ParagraphBlock({ d }: { d: NewsParagraphData }) {
  return (
    <section className="gtv-container">
      {d.title && (
        <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-6 max-w-[940px] mx-auto" dangerouslySetInnerHTML={{ __html: d.title }} />
      )}
      {d.body && (
        <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto whitespace-pre-line" dangerouslySetInnerHTML={{ __html: d.body }} />
      )}
    </section>
  );
}

function ShareBlock({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <section className="gtv-container">
      <div className="max-w-[940px] mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 py-8 border-t border-b border-warm-200">
        <a href={fb} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light">
          <Facebook size={18} /><span className="group-hover:underline" style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>Condividi su Facebook</span>
        </a>
        <a href={tw} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light">
          <span className="font-serif font-bold text-[18px] leading-none">X</span><span className="group-hover:underline" style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>Condividi su X</span>
        </a>
        <button type="button" onClick={copy} className="group flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light">
          <LinkIcon size={18} /><span className="group-hover:underline" style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>{copied ? "Link copiato!" : "Copia link"}</span>
        </button>
      </div>
    </section>
  );
}

function RelatedBlock({ related, categoryLabelMap }: { related: NewsArticle[]; categoryLabelMap: Map<string, string> }) {
  if (!related.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="px-2 md:px-3 lg:px-4">
        <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">Continua a leggere</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20">
          {related.slice(0, 4).map((rel) => (
            <Link key={rel.id} href={`/news/${rel.slug}`} className="group block">
              <div className="relative aspect-[1/1] bg-warm-100 overflow-hidden">
                {rel.imageUrl && <Image src={rel.imageUrl} alt={rel.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />}
              </div>
              <div className="mt-4">
                {rel.category && <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">{categoryLabelMap.get(rel.category) || rel.category}</p>}
                <h4 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">{rel.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const lang = useLang();
  const [article, setArticle] = useState<ArticleWithRelated | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/news/slug?slug=${slug}&lang=${lang}`).then((r) => r.json()).then((data) => {
      if (data.success) setArticle(data.data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, lang]);

  useEffect(() => {
    fetch(`/api/categories?contentType=news&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []));
  }, [lang]);

  const categoryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.value, c.label));
    return m;
  }, [categories]);

  const blocksV2: NewsBlockV2[] | null = (() => {
    if (!article?.blocks) return null;
    try {
      const p = JSON.parse(article.blocks);
      return Array.isArray(p) ? (p as NewsBlockV2[]) : null;
    } catch { return null; }
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-warm-500">Articolo non trovato</p>
        <Link href="/news" className="gtv-link">Torna alle news</Link>
      </div>
    );
  }

  const useV2 = blocksV2 && blocksV2.length > 0;

  return (
    <>
      {/* ── TITLE SECTION ────────────────────────────────────── */}
      <section className="gtv-container pb-0 pt-[76px] md:pt-[108px]">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-center">
          {article.category && (
            <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light" style={{ marginBottom: "44px" }}>{categoryLabelMap.get(article.category) || article.category}</p>
          )}
          <h1 className="font-serif text-[34px] md:text-[58px] text-black tracking-tight font-light leading-[1.2] max-w-[940px] mx-auto" style={{ marginBottom: "10px" }}>
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light mt-6">{article.subtitle}</p>
          )}
        </motion.div>
      </section>

      {useV2 ? (
        (() => {
          const rendered = blocksV2!.filter((b) => b.type !== "related");
          const hasRelated = (article.related?.length ?? 0) > 0;
          return (
            <div className={`pt-12 md:pt-20${hasRelated ? "" : " pb-20 md:pb-28"}`}>
              {rendered.map((b, idx) => {
                const prev = idx > 0 ? rendered[idx - 1] : null;
                const greyAdjacent = prev?.type === "image_text_bg" && b.type === "image_text_bg";
                const spacing = idx === 0 ? "" : greyAdjacent ? "" : "mt-20 md:mt-28";
                let node: React.ReactNode = null;
                switch (b.type) {
                  case "paragraph": node = <ParagraphBlock d={b.data as NewsParagraphData} />; break;
                  case "image_text_bg": node = <ImageTextBg d={b.data as NewsImageTextBgData} title={article.title} />; break;
                  case "three_images": node = <ThreeImages d={b.data as NewsThreeImagesData} />; break;
                  case "single_image": node = <SingleImage d={b.data as NewsSingleImageData} />; break;
                  case "image_with_paragraph": node = <ImageWithParagraph d={b.data as NewsImageWithParagraphData} />; break;
                  case "fullwidth_banner": node = <FullwidthBanner d={b.data as NewsFullwidthBannerData} />; break;
                  case "product": node = <ProductBlock productId={(b.data as NewsProductData).productId} />; break;
                  case "share": node = <ShareBlock title={article.title} />; break;
                  default: node = null;
                }
                return <div key={b.id} className={spacing}>{node}</div>;
              })}
              {hasRelated && <RelatedBlock related={article.related!} categoryLabelMap={categoryLabelMap} />}
            </div>
          );
        })()
      ) : (
        <div className="pt-12 md:pt-20 pb-20 md:pb-28">
          {article.related && article.related.length > 0 && <RelatedBlock related={article.related} categoryLabelMap={categoryLabelMap} />}
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="gtv-container pt-8 pb-12">
        <nav className="flex items-center gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <ChevronRight size={12} />
          <Link href="/news">News & Rassegna Stampa</Link>
          <ChevronRight size={12} />
          <span>{article.title}</span>
        </nav>
      </div>
    </>
  );
}
