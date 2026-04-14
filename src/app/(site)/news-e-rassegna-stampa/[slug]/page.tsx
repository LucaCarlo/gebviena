"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import type { NewsArticle } from "@/types";
import { useLang } from "@/contexts/I18nContext";

interface ArticleWithRelated extends NewsArticle {
  related?: NewsArticle[];
}

interface StoriaSection {
  title: string;
  text: string;
  imageUrl: string;
}

interface StoriaBlocks {
  mediaType: "video" | "image";
  mediaUrl: string;
  sections: StoriaSection[];
  iconUrl: string;
  iconTitle: string;
  iconText: string;
  productId: string;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  coverImage: string | null;
}

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Click-to-play video ────────────────────────────────── */
function ClickToPlayVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play();
      setPlaying(true);
    }
  }, [playing]);

  // Handle YouTube / Vimeo embeds
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (vimeoMatch) {
    return (
      <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Direct video file
  return (
    <div className="relative w-full bg-warm-100 cursor-pointer" style={{ aspectRatio: "16 / 9" }} onClick={handlePlay}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        onEnded={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={32} className="text-dark ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Alternating image+text section ─────────────────────── */
function ImageTextSection({ section, imageRight }: { section: StoriaSection; imageRight: boolean }) {
  const hasContent = section.title || section.text || section.imageUrl;
  if (!hasContent) return null;

  const imageEl = (
    <div className="relative bg-warm-200" style={{ aspectRatio: "16/9" }}>
      {section.imageUrl && (
        <Image src={section.imageUrl} alt={section.title || ""} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
      )}
    </div>
  );

  const textEl = (
    <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
      {section.title && (
        <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-dark leading-[1.15] tracking-tight mb-6">
          {section.title}
        </h2>
      )}
      {section.text && (
        <div className="text-lg text-dark leading-[1.8] font-light prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: section.text }} />
      )}
    </div>
  );

  return (
    <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
        {imageRight ? (
          <>{textEl}{imageEl}</>
        ) : (
          <>{imageEl}{textEl}</>
        )}
      </div>
    </section>
  );
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const lang = useLang();
  const [article, setArticle] = useState<ArticleWithRelated | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/news/slug?slug=${slug}&lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setArticle(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, lang]);

  /* Parse storia blocks */
  const storia: StoriaBlocks | null = (() => {
    if (article?.category !== "storia") return null;
    try {
      const parsed = JSON.parse(article?.blocks || "{}");
      return {
        mediaType: parsed.mediaType || "video",
        mediaUrl: parsed.mediaUrl || "",
        sections: parsed.sections || [],
        iconUrl: parsed.iconUrl || "",
        iconTitle: parsed.iconTitle || "",
        iconText: parsed.iconText || "",
        productId: parsed.productId || "",
      };
    } catch {
      return null;
    }
  })();

  /* Fetch referenced product */
  useEffect(() => {
    if (!storia?.productId) return;
    fetch(`/api/products/${storia.productId}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setProduct(data.data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.blocks]);

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
        <Link href="/news-e-rassegna-stampa" className="gtv-link">Torna alle news</Link>
      </div>
    );
  }

  const isStoria = article.category === "storia";

  return (
    <>
      {/* ── TITLE SECTION ────────────────────────────────────── */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center px-8 max-w-4xl mx-auto"
        >
          {article.category && (
            <p className="text-base md:text-lg uppercase tracking-[0.2em] text-dark mb-5">
              {article.category}
            </p>
          )}
          <h1 className="font-serif text-3xl md:text-5xl lg:text-[4rem] text-dark leading-[1.15] tracking-tight">
            {article.title}
          </h1>
          {isStoria && article.subtitle && (
            <p className="text-base md:text-lg uppercase tracking-[0.2em] text-dark mt-5">
              {article.subtitle}
            </p>
          )}
        </motion.div>
      </section>

      {/* spacer */}
      <div className="h-8 md:h-16" />

      {/* ── IMAGE + TEXT (Born in Vienna style) ───────────────── */}
      {(article.imageUrl || article.content) && (
        <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
            {/* Left: image */}
            <div className="relative bg-warm-200" style={{ aspectRatio: "16/9" }}>
              {article.imageUrl && (
                <Image src={article.imageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              )}
            </div>
            {/* Right: title + text */}
            <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
              {!isStoria && article.subtitle && (
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-dark leading-[1.15] tracking-tight mb-6">
                  {article.subtitle}
                </h2>
              )}
              {article.content && (
                <div className="text-lg text-dark leading-[1.8] font-light prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          STORIA-SPECIFIC SECTIONS
          ══════════════════════════════════════════════════════════ */}
      {isStoria && storia && (
        <>
          {/* ── MEDIA (video or image) ───────────────────────── */}
          {storia.mediaUrl && (
            <section className="py-16 md:py-24">
              <FadeIn className="gtv-container">
                {storia.mediaType === "video" ? (
                  <ClickToPlayVideo src={storia.mediaUrl} />
                ) : (
                  <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                    <Image src={storia.mediaUrl} alt="" fill className="object-cover" sizes="100vw" />
                  </div>
                )}
              </FadeIn>
            </section>
          )}

          {/* ── THREE ALTERNATING SECTIONS (no spacing) ──────── */}
          {storia.sections.length > 0 && (
            <div>
              {/* Section 0: image RIGHT */}
              {storia.sections[0] && <ImageTextSection section={storia.sections[0]} imageRight />}
              {/* Section 1: image LEFT */}
              {storia.sections[1] && <ImageTextSection section={storia.sections[1]} imageRight={false} />}
              {/* Section 2: image RIGHT */}
              {storia.sections[2] && <ImageTextSection section={storia.sections[2]} imageRight />}
            </div>
          )}

          {/* ── ICON + CENTERED TEXT ─────────────────────────── */}
          {(storia.iconUrl || storia.iconTitle || storia.iconText) && (
            <section className="py-24 md:py-32">
              <FadeIn className="text-center max-w-2xl mx-auto px-8">
                {storia.iconUrl && (
                  <div className="relative w-20 h-20 mx-auto mb-8">
                    <Image src={storia.iconUrl} alt="" fill className="object-contain" sizes="80px" />
                  </div>
                )}
                {storia.iconTitle && (
                  <h2 className="font-serif text-2xl md:text-3xl text-dark leading-[1.2] tracking-tight mb-5">
                    {storia.iconTitle}
                  </h2>
                )}
                {storia.iconText && (
                  <p className="text-lg text-dark leading-[1.8] font-light">
                    {storia.iconText}
                  </p>
                )}
              </FadeIn>
            </section>
          )}

          {/* ── PRODUCT REFERENCE (like "L'armonia del legno") ── */}
          {product && (
            <section className="relative w-full" style={{ height: "90vh" }}>
              <Image
                src={product.coverImage || product.imageUrl}
                alt={product.name}
                fill
                className="object-cover brightness-[0.45]"
                sizes="100vw"
              />
              <div className="absolute top-12 md:top-16 lg:top-20 left-8 md:left-16 lg:left-20 max-w-lg">
                <h2 className="font-sans text-2xl md:text-3xl lg:text-[2.5rem] text-white font-light uppercase tracking-wide leading-snug">
                  {product.name}
                </h2>
                <Link
                  href={`/prodotti/${product.slug}`}
                  className="inline-flex items-center gap-2 mt-4 md:mt-5 uppercase text-[16px] tracking-[0.03em] font-medium text-white/80 hover:text-white hover:underline transition-colors"
                >
                  Scopri il prodotto
                  <span>&rarr;</span>
                </Link>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── CONTINUA A LEGGERE ───────────────────────────────── */}
      {article.related && article.related.length > 0 && (
        <section className="py-20 md:py-28 border-t border-warm-200">
          <div className="gtv-container">
            <h3 className="text-center font-sans text-base md:text-lg uppercase tracking-[0.15em] text-dark mb-12">
              Continua a leggere
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {article.related.slice(0, 4).map((rel) => (
                <Link key={rel.id} href={`/news-e-rassegna-stampa/${rel.slug}`} className="group block">
                  <div className="relative aspect-square bg-warm-100 overflow-hidden">
                    {rel.imageUrl && (
                      <Image src={rel.imageUrl} alt={rel.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
                    )}
                  </div>
                  <div className="mt-3">
                    {rel.category && <p className="text-xs uppercase tracking-[0.15em] text-warm-400">{rel.category}</p>}
                    <h4 className="text-sm md:text-base font-normal uppercase tracking-[0.08em] text-dark mt-1 group-hover:text-warm-500 transition-colors">{rel.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container pb-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/news-e-rassegna-stampa" className="hover:text-warm-700 transition-colors">News &amp; Rassegna Stampa</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">{article.title}</span>
        </nav>
      </div>
    </>
  );
}
