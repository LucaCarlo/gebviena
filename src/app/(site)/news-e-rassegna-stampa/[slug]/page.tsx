"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, Facebook, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import type {
  NewsArticle, NewsBlockV2,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
} from "@/types";
import { useLang } from "@/contexts/I18nContext";

interface ArticleWithRelated extends NewsArticle {
  related?: NewsArticle[];
}

interface StoriaSection { title: string; text: string; imageUrl: string; }
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
  id: string; name: string; slug: string; imageUrl: string; coverImage: string | null;
}

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className={className}>
      {children}
    </motion.div>
  );
}

function ClickToPlayVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const handlePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); } else { v.play(); setPlaying(true); }
  }, [playing]);

  const ytMatch = src.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
  if (ytMatch) {
    return (
      <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
        <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="relative w-full bg-warm-100 cursor-pointer" style={{ aspectRatio: "16 / 9" }} onClick={handlePlay}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline onEnded={() => setPlaying(false)}>
        <source src={src} type="video/mp4" />
      </video>
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center"><Play size={32} className="text-dark ml-1" /></div>
        </div>
      )}
    </div>
  );
}

function ImageTextBg({ d, title: articleTitle }: { d: NewsImageTextBgData; title: string }) {
  const imgLeft = d.imagePosition === "left";
  const imageEl = (
    <div className="relative bg-warm-200 w-full h-full min-h-[60vh]">
      {d.imageUrl && <Image src={d.imageUrl} alt={d.title || articleTitle} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />}
    </div>
  );
  const textEl = (
    <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
      {d.title && (
        <h2 className="font-serif text-[34px] md:text-[44px] text-dark tracking-tight font-light leading-[1.15] mb-6" dangerouslySetInnerHTML={{ __html: d.title }} />
      )}
      {d.text && (
        <div className="text-[18px] text-dark leading-[1.8] font-light [&_p]:mb-4 [&_p:last-child]:mb-0 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: d.text }} />
      )}
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
  if (!d.imageUrl) return null;
  return (
    <section className="gtv-container">
      <div className="mx-auto max-w-[1200px]">
        <Image src={d.imageUrl} alt={d.caption || ""} width={1600} height={1000} className="w-full h-auto" sizes="(max-width: 1200px) 100vw, 1200px" />
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
        <a href={fb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light hover:opacity-70 transition-opacity">
          <Facebook size={18} />Condividi su Facebook
        </a>
        <a href={tw} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light hover:opacity-70 transition-opacity">
          <span className="font-serif font-bold text-[18px] leading-none">X</span>Condividi su X
        </a>
        <button type="button" onClick={copy} className="flex items-center gap-2 text-[16px] uppercase tracking-[0.05em] text-black font-light hover:opacity-70 transition-opacity">
          <LinkIcon size={18} />{copied ? "Link copiato!" : "Copia link"}
        </button>
      </div>
    </section>
  );
}

function RelatedBlock({ related }: { related: NewsArticle[] }) {
  if (!related.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="px-2 md:px-3 lg:px-4">
        <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">Continua a leggere</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20">
          {related.slice(0, 4).map((rel) => (
            <Link key={rel.id} href={`/news-e-rassegna-stampa/${rel.slug}`} className="group block">
              <div className="relative aspect-[1/1] bg-warm-100 overflow-hidden">
                {rel.imageUrl && <Image src={rel.imageUrl} alt={rel.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />}
              </div>
              <div className="mt-4">
                {rel.category && <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">{rel.category}</p>}
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
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/news/slug?slug=${slug}&lang=${lang}`).then((r) => r.json()).then((data) => {
      if (data.success) setArticle(data.data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, lang]);

  const blocksV2: NewsBlockV2[] | null = (() => {
    if (!article?.blocks) return null;
    try {
      const p = JSON.parse(article.blocks);
      return Array.isArray(p) ? (p as NewsBlockV2[]) : null;
    } catch { return null; }
  })();

  const storia: StoriaBlocks | null = (() => {
    if (article?.category !== "storia") return null;
    try {
      const parsed = JSON.parse(article?.blocks || "{}");
      if (Array.isArray(parsed)) return null;
      return {
        mediaType: parsed.mediaType || "video", mediaUrl: parsed.mediaUrl || "",
        sections: parsed.sections || [], iconUrl: parsed.iconUrl || "",
        iconTitle: parsed.iconTitle || "", iconText: parsed.iconText || "",
        productId: parsed.productId || "",
      };
    } catch { return null; }
  })();

  useEffect(() => {
    if (!storia?.productId) return;
    fetch(`/api/products/${storia.productId}`).then((r) => r.json()).then((data) => {
      if (data.success) setProduct(data.data);
    }).catch(() => {});
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
  const useV2 = !isStoria && blocksV2 && blocksV2.length > 0;

  return (
    <>
      {/* ── TITLE SECTION ────────────────────────────────────── */}
      <section className="gtv-container pb-0 pt-[76px] md:pt-[108px]">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-center">
          {article.category && (
            <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light" style={{ marginBottom: "44px" }}>{article.category}</p>
          )}
          <h1 className="font-serif text-[34px] md:text-[58px] text-black tracking-tight font-light leading-[1.2] max-w-[940px] mx-auto" style={{ marginBottom: "10px" }}>
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="text-[20px] text-black leading-snug font-light tracking-normal max-w-[940px] mx-auto mt-6">{article.subtitle}</p>
          )}
        </motion.div>
      </section>

      {useV2 ? (
        <div className="pt-12 md:pt-20 pb-20 md:pb-28 space-y-20 md:space-y-28">
          {blocksV2!.map((b) => {
            switch (b.type) {
              case "paragraph": return <ParagraphBlock key={b.id} d={b.data as NewsParagraphData} />;
              case "image_text_bg": return <ImageTextBg key={b.id} d={b.data as NewsImageTextBgData} title={article.title} />;
              case "three_images": return <ThreeImages key={b.id} d={b.data as NewsThreeImagesData} />;
              case "single_image": return <SingleImage key={b.id} d={b.data as NewsSingleImageData} />;
              case "share": return <ShareBlock key={b.id} title={article.title} />;
              case "related": return <RelatedBlock key={b.id} related={article.related || []} />;
              default: return null;
            }
          })}
        </div>
      ) : (
        <>
          {/* spacer */}
          <div className="h-8 md:h-16" />

          {/* Legacy image + text */}
          {(article.imageUrl || article.content) && (
            <section className="w-full bg-warm-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0">
                <div className="relative bg-warm-200 w-full h-full min-h-[60vh]">
                  {article.imageUrl && <Image src={article.imageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />}
                </div>
                <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
                  {!isStoria && article.subtitle && (
                    <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-dark leading-[1.15] tracking-tight mb-6">{article.subtitle}</h2>
                  )}
                  {article.content && (
                    <div className="text-lg text-dark leading-[1.8] font-light prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
                  )}
                </div>
              </div>
            </section>
          )}

          {isStoria && storia && (
            <>
              {storia.mediaUrl && (
                <section className="py-16 md:py-24">
                  <FadeIn className="gtv-container">
                    {storia.mediaType === "video" ? <ClickToPlayVideo src={storia.mediaUrl} /> : (
                      <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
                        <Image src={storia.mediaUrl} alt="" fill className="object-cover" sizes="100vw" />
                      </div>
                    )}
                  </FadeIn>
                </section>
              )}
              {storia.sections.length > 0 && (
                <div>
                  {storia.sections[0] && <ImageTextBg d={{ title: storia.sections[0].title, text: storia.sections[0].text, imageUrl: storia.sections[0].imageUrl, imagePosition: "right" }} title={article.title} />}
                  {storia.sections[1] && <ImageTextBg d={{ title: storia.sections[1].title, text: storia.sections[1].text, imageUrl: storia.sections[1].imageUrl, imagePosition: "left" }} title={article.title} />}
                  {storia.sections[2] && <ImageTextBg d={{ title: storia.sections[2].title, text: storia.sections[2].text, imageUrl: storia.sections[2].imageUrl, imagePosition: "right" }} title={article.title} />}
                </div>
              )}
              {(storia.iconUrl || storia.iconTitle || storia.iconText) && (
                <section className="py-24 md:py-32">
                  <FadeIn className="text-center max-w-2xl mx-auto px-8">
                    {storia.iconUrl && <div className="relative w-20 h-20 mx-auto mb-8"><Image src={storia.iconUrl} alt="" fill className="object-contain" sizes="80px" /></div>}
                    {storia.iconTitle && <h2 className="font-serif text-2xl md:text-3xl text-dark leading-[1.2] tracking-tight mb-5">{storia.iconTitle}</h2>}
                    {storia.iconText && <p className="text-lg text-dark leading-[1.8] font-light">{storia.iconText}</p>}
                  </FadeIn>
                </section>
              )}
              {product && (
                <section className="relative w-full" style={{ height: "90vh" }}>
                  <Image src={product.coverImage || product.imageUrl} alt={product.name} fill className="object-cover brightness-[0.45]" sizes="100vw" />
                  <div className="absolute top-12 md:top-16 lg:top-20 left-8 md:left-16 lg:left-20 max-w-lg">
                    <h2 className="font-sans text-2xl md:text-3xl lg:text-[2.5rem] text-white font-light uppercase tracking-wide leading-snug">{product.name}</h2>
                    <Link href={`/prodotti/${product.slug}`} className="inline-flex items-center gap-2 mt-4 md:mt-5 uppercase text-[16px] tracking-[0.03em] font-medium text-white/80 hover:text-white hover:underline transition-colors">
                      Scopri il prodotto<span>&rarr;</span>
                    </Link>
                  </div>
                </section>
              )}
            </>
          )}

          {article.related && article.related.length > 0 && <RelatedBlock related={article.related} />}
        </>
      )}

      {/* Breadcrumbs */}
      <div className="gtv-container pt-8 pb-12">
        <nav className="flex items-center gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <ChevronRight size={12} />
          <Link href="/news-e-rassegna-stampa">News & Rassegna Stampa</Link>
          <ChevronRight size={12} />
          <span>{article.title}</span>
        </nav>
      </div>
    </>
  );
}
