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
  NewsCaslonTitleData, NewsTwoImagesInlineData,
  NewsFeatureToolData, NewsCardsRowData, NewsFaqData, NewsStatsData,
  NewsQuoteData, NewsTimelineData, NewsComparisonTableData,
  NewsCta,
} from "@/types";
import { useT, useLang } from "@/contexts/I18nContext";
import { buildLabelLookup, lookupLabel } from "@/lib/category-lookup";
import { localizePath } from "@/lib/path-segments";

function isVideoFile(url: string | undefined | null): boolean {
  return !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

/* Video player per news. Le due opzioni (autoplay e controls) sono indipendenti:
   - autoplay solo → background muto in loop
   - controls solo → click-to-play con barra
   - entrambi → parte da solo e mostra anche la barra
   - nessuno → richiede click ma senza barra visibile (raro) */
function NewsVideoFill({ src, autoplay = false, controls = true, className = "" }: { src: string; autoplay?: boolean; controls?: boolean; className?: string }) {
  // muted è obbligatorio per autoplay (policy browser); se non c'è autoplay teniamo il suono attivo
  return (
    <video
      src={src}
      autoPlay={autoplay || undefined}
      muted={autoplay || undefined}
      loop={autoplay || undefined}
      controls={controls || undefined}
      playsInline
      preload={autoplay ? undefined : "metadata"}
      className={`${controls ? "news-video " : ""}absolute inset-0 w-full h-full object-cover bg-black ${className}`}
    />
  );
}

/* Variante inline (w-full h-auto) per i blocchi che mostrano video nel flusso. */
function NewsVideoInline({ src, autoplay = false, controls = true, className = "w-full h-auto bg-warm-100" }: { src: string; autoplay?: boolean; controls?: boolean; className?: string }) {
  return (
    <video
      src={src}
      autoPlay={autoplay || undefined}
      muted={autoplay || undefined}
      loop={autoplay || undefined}
      controls={controls || undefined}
      playsInline
      preload={autoplay ? undefined : "metadata"}
      className={`${controls ? "news-video " : ""}${className}`}
    />
  );
}

/* Renderer "smart" che decide tra YouTube/Vimeo/video locale/immagine in base ai dati.
   Usato dove l'admin può scegliere immagine OPPURE videoUrl esterno. */
function NewsMediaSmart({ imageUrl, videoUrl, alt, autoplay, controls, fillContainer = false, aspectRatio = "3 / 4.2" }: { imageUrl?: string; videoUrl?: string; alt?: string; autoplay?: boolean; controls?: boolean; fillContainer?: boolean; aspectRatio?: string }) {
  const ext = (videoUrl || "").trim();
  const yt = ext.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const vimeo = ext.match(/vimeo\.com\/(\d+)/);
  const isExtVid = !!(yt || vimeo);
  const localVid = !isExtVid && ext && isVideoFile(ext) ? ext : (isVideoFile(imageUrl) ? imageUrl! : "");
  const wrapper = fillContainer
    ? <div className="relative w-full h-full bg-warm-100 overflow-hidden">{null}</div>
    : null;
  void wrapper;
  const containerStyle = fillContainer ? undefined : { aspectRatio };
  const containerClass = fillContainer ? "relative w-full h-full bg-warm-100 overflow-hidden" : "relative w-full bg-warm-100 overflow-hidden";

  if (yt) {
    return (
      <div className={containerClass} style={containerStyle}>
        <iframe src={`https://www.youtube.com/embed/${yt[1]}${autoplay ? `?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=${controls === false ? 0 : 1}` : `?rel=0&controls=${controls === false ? 0 : 1}`}`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (vimeo) {
    return (
      <div className={containerClass} style={containerStyle}>
        <iframe src={`https://player.vimeo.com/video/${vimeo[1]}${autoplay ? "?autoplay=1&muted=1&loop=1" : ""}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (localVid) {
    return <NewsVideoFill src={localVid} autoplay={!!autoplay} controls={controls !== false} />;
  }
  if (imageUrl) {
    return <Image src={imageUrl} alt={alt || ""} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />;
  }
  return null;
}

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
  const imageIsVideo = isVideoFile(d.imageUrl);
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
                <NewsVideoInline src={video} autoplay={!!d.videoAutoplay} controls={d.videoControls !== false} />
              )
            ) : imageIsVideo ? (
              <NewsVideoInline src={d.imageUrl} autoplay={!!d.videoAutoplay} controls={d.videoControls !== false} />
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
  if (!d.imageUrl && !d.videoUrl) return null;
  return (
    <section className="relative w-full" style={{ height: "85vh" }}>
      <div className={`absolute inset-0 ${d.videoAutoplay ? "brightness-[0.6]" : "brightness-[0.85]"}`}>
        <NewsMediaSmart imageUrl={d.imageUrl} videoUrl={d.videoUrl} alt={d.title || ""} autoplay={!!d.videoAutoplay} controls={d.videoControls !== false} fillContainer />
      </div>
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
      {(d.imageUrl || d.videoUrl) && (
        <NewsMediaSmart imageUrl={d.imageUrl} videoUrl={d.videoUrl} alt={d.title || articleTitle} autoplay={!!d.videoAutoplay} controls={d.videoControls !== false} fillContainer />
      )}
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
  const imgs = (d.images || []).filter((i) => i.url || i.videoUrl);
  if (!imgs.length) return null;
  return (
    <section className="px-2 md:px-3 lg:px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 md:gap-x-4 gap-y-8">
        {imgs.map((img, i) => (
          <div key={i}>
            <div className="relative aspect-[2/3] bg-warm-100 overflow-hidden">
              <NewsMediaSmart imageUrl={img.url} videoUrl={img.videoUrl} alt={img.caption || ""} fillContainer />
            </div>
            {img.caption && <p className="text-[14px] text-black mt-3 font-light text-center">{img.caption}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function CaslonTitle({ d }: { d: NewsCaslonTitleData }) {
  if (!d.text || !d.text.trim()) return null;
  const align = d.align || "center";
  const textAlign = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <section className="gtv-container">
      <div className={`mx-auto max-w-[940px] px-6 md:px-12 ${textAlign}`}>
        <h2
          className="font-serif text-[36px] md:text-[56px] text-black leading-[1.15] font-normal tracking-tight"
          dangerouslySetInnerHTML={{ __html: d.text }}
        />
      </div>
    </section>
  );
}

function TwoImagesInline({ d }: { d: NewsTwoImagesInlineData }) {
  const imgs = (d.images || []).filter((i) => i.url || i.videoUrl);
  if (imgs.length === 0) return null;
  const align = d.align || "center";
  const justify = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  return (
    <section className="gtv-container">
      <div className={`mx-auto max-w-[1240px] px-4 md:px-6 flex ${justify}`}>
        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-[820px]">
          {imgs.slice(0, 2).map((img, i) => (
            <div key={i}>
              <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
                <NewsMediaSmart imageUrl={img.url} videoUrl={img.videoUrl} alt={img.caption || ""} fillContainer />
              </div>
              {img.caption && <p className="text-[13px] text-black mt-2 font-light text-center">{img.caption}</p>}
            </div>
          ))}
        </div>
      </div>
      {d.caption && (
        <div className={`mx-auto max-w-[1240px] px-4 md:px-6 mt-3 flex ${justify}`}>
          <div className="max-w-[820px] w-full">
            <p className="text-[13px] text-warm-500 text-center font-light">{d.caption}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SingleImage({ d }: { d: NewsSingleImageData }) {
  if (!d.imageUrl && !d.videoUrl) return null;
  const video = d.videoUrl?.trim();
  const imageIsVideo = isVideoFile(d.imageUrl);
  const yt = video?.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  const vimeo = video?.match(/vimeo\.com\/(\d+)/);
  const autoplay = !!d.videoAutoplay;
  return (
    <section className="gtv-container">
      <div className="mx-auto max-w-[940px]">
        {video ? (
          yt ? (
            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
              <iframe src={`https://www.youtube.com/embed/${yt[1]}${autoplay ? `?autoplay=1&mute=1&loop=1&playlist=${yt[1]}` : "?rel=0"}`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : vimeo ? (
            <div className="relative w-full bg-warm-100" style={{ aspectRatio: "16 / 9" }}>
              <iframe src={`https://player.vimeo.com/video/${vimeo[1]}${autoplay ? "?autoplay=1&muted=1&loop=1" : ""}`} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <NewsVideoInline src={video} autoplay={autoplay} controls={d.videoControls !== false} />
          )
        ) : imageIsVideo ? (
          <NewsVideoInline src={d.imageUrl} autoplay={autoplay} controls={d.videoControls !== false} />
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

function RelatedBlock({ related, categoryLabelMap, title }: { related: NewsArticle[]; categoryLabelMap: Map<string, string>; title: string }) {
  if (!related.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="px-2 md:px-3 lg:px-4">
        <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] text-center mb-12">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20">
          {related.slice(0, 4).map((rel) => (
            <Link key={rel.id} href={`/mondo-gtv/news-e-rassegna-stampa/${rel.slug}`} className="group block">
              <div className="relative aspect-[1/1] bg-warm-100 overflow-hidden">
                {rel.imageUrl && <Image src={rel.imageUrl} alt={rel.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />}
              </div>
              <div className="mt-4">
                {rel.category && <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">{lookupLabel(categoryLabelMap, rel.category)}</p>}
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
  const t = useT();
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

  const categoryLabelMap = useMemo(() => buildLabelLookup(categories), [categories]);

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
        <Link href="/mondo-gtv/news-e-rassegna-stampa" className="gtv-link">Torna alle news</Link>
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
            <p className="uppercase text-[20px] tracking-[0.03em] text-black font-light" style={{ marginBottom: "44px" }}>{lookupLabel(categoryLabelMap, article.category)}</p>
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
                  case "caslon_title": node = <CaslonTitle d={b.data as NewsCaslonTitleData} />; break;
                  case "two_images_inline": node = <TwoImagesInline d={b.data as NewsTwoImagesInlineData} />; break;
                  case "feature_tool": node = <FeatureTool d={b.data as NewsFeatureToolData} />; break;
                  case "cards_row": node = <CardsRow d={b.data as NewsCardsRowData} />; break;
                  case "faq": node = <FaqBlock d={b.data as NewsFaqData} />; break;
                  case "stats": node = <StatsBlock d={b.data as NewsStatsData} />; break;
                  case "quote": node = <QuoteBlock d={b.data as NewsQuoteData} />; break;
                  case "timeline": node = <TimelineBlock d={b.data as NewsTimelineData} />; break;
                  case "comparison_table": node = <ComparisonTableBlock d={b.data as NewsComparisonTableData} />; break;
                  case "product": node = <ProductBlock productId={(b.data as NewsProductData).productId} />; break;
                  case "share": node = <ShareBlock title={article.title} />; break;
                  default: node = null;
                }
                return <div key={b.id} className={spacing}>{node}</div>;
              })}
              {hasRelated && <RelatedBlock related={article.related!} categoryLabelMap={categoryLabelMap} title={t("news.detail.continue")} />}
            </div>
          );
        })()
      ) : (
        <div className="pt-12 md:pt-20 pb-20 md:pb-28">
          {article.related && article.related.length > 0 && <RelatedBlock related={article.related} categoryLabelMap={categoryLabelMap} title={t("news.detail.continue")} />}
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="gtv-container pt-8 pb-12">
        <nav className="flex items-center gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href={localizePath("/", lang)}>{t("common.breadcrumb_home")}</Link>
          <ChevronRight size={12} />
          <Link href={localizePath("/mondo-gtv/news-e-rassegna-stampa", lang)}>{t("news.breadcrumb")}</Link>
          <ChevronRight size={12} />
          <span>{article.title}</span>
        </nav>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RENDER PUBBLICO DEI NUOVI BLOCK TYPES
   ───────────────────────────────────────────────────────────────────────── */

function CtaButton({ cta }: { cta: NewsCta }) {
  const isPdf = /\.pdf($|\?)/i.test(cta.href || "");
  const ext = /^https?:\/\//i.test(cta.href || "");
  const linkProps = isPdf
    ? { download: "", target: "_blank", rel: "noopener noreferrer" }
    : ext ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const style = cta.style || "default";
  if (style === "google_play" || style === "app_store") {
    const isGP = style === "google_play";
    return (
      <a href={cta.href || "#"} {...linkProps} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-warm-900 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {isGP ? (
            <path d="M3.609 1.814 13.792 12 3.61 22.186A.997.997 0 0 1 3 21.275V2.725a1 1 0 0 1 .609-.911zm10.89 10.893L21.4 8.829A1 1 0 0 1 21.4 15.17l-6.9 4.122-3.501-3.501zm-1.5 1.5L4.609 22.586 14.79 13.79l-1.792-1.793z"/>
          ) : (
            <path d="M17.05 12.04c-.03-2.83 2.31-4.18 2.42-4.25-1.32-1.93-3.37-2.19-4.1-2.22-1.75-.18-3.41 1.03-4.3 1.03-.89 0-2.25-1-3.7-.98-1.9.03-3.66 1.11-4.64 2.81-1.98 3.43-.51 8.5 1.42 11.28.94 1.36 2.06 2.89 3.52 2.84 1.42-.06 1.95-.91 3.66-.91s2.2.91 3.7.88c1.53-.03 2.5-1.38 3.43-2.75 1.09-1.58 1.54-3.11 1.56-3.19-.03-.01-2.99-1.15-3.02-4.56zM14.6 4.07c.79-.95 1.32-2.27 1.18-3.59-1.13.05-2.51.75-3.32 1.7-.72.83-1.36 2.17-1.19 3.45 1.27.1 2.55-.64 3.33-1.56z"/>
          )}
        </svg>
        <span className="text-sm">{cta.label || (isGP ? "Google Play" : "App Store")}</span>
      </a>
    );
  }
  if (style === "windows" || style === "macos") {
    const isWin = style === "windows";
    return (
      <a href={cta.href || "#"} {...linkProps} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-warm-900 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {isWin ? (
            <path d="M2 4.5 10 3v8.5H2V4.5zM2 13H10v8.5L2 19.5V13zm9-10.07L22 1.4V11h-11V2.93zM11 13h11v9.6L11 21V13z"/>
          ) : (
            <path d="M17.05 12.04c-.03-2.83 2.31-4.18 2.42-4.25-1.32-1.93-3.37-2.19-4.1-2.22-1.75-.18-3.41 1.03-4.3 1.03-.89 0-2.25-1-3.7-.98-1.9.03-3.66 1.11-4.64 2.81-1.98 3.43-.51 8.5 1.42 11.28.94 1.36 2.06 2.89 3.52 2.84 1.42-.06 1.95-.91 3.66-.91s2.2.91 3.7.88c1.53-.03 2.5-1.38 3.43-2.75 1.09-1.58 1.54-3.11 1.56-3.19-.03-.01-2.99-1.15-3.02-4.56zM14.6 4.07c.79-.95 1.32-2.27 1.18-3.59-1.13.05-2.51.75-3.32 1.7-.72.83-1.36 2.17-1.19 3.45 1.27.1 2.55-.64 3.33-1.56z"/>
          )}
        </svg>
        <span className="text-sm">{cta.label || (isWin ? "Windows" : "macOS")}</span>
      </a>
    );
  }
  return (
    <a href={cta.href || "#"} {...linkProps} className="inline-flex items-center gap-1 uppercase text-[14px] tracking-[0.03em] text-black font-medium hover:underline" style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>
      {cta.label || "Scopri"} &rarr;
    </a>
  );
}

function FeatureTool({ d }: { d: NewsFeatureToolData }) {
  const imgLeft = d.imagePosition !== "right";
  const isVid = isVideoFile(d.imageUrl);
  const imageEl = (
    <div className="relative bg-warm-100 overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
      {d.imageUrl && (isVid ? (
        <NewsVideoFill src={d.imageUrl} autoplay={!!d.videoAutoplay} controls={d.videoControls !== false} />
      ) : (
        <Image src={d.imageUrl} alt={d.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
      ))}
    </div>
  );
  const contentEl = (
    <div className="px-6 py-10 md:px-10 md:py-12">
      {d.logoUrl && (
        <div className="relative w-12 h-12 mb-3">
          <Image src={d.logoUrl} alt="" fill className="object-contain" sizes="48px" />
        </div>
      )}
      <h3 className="text-[28px] md:text-[32px] font-sans text-black font-light mb-3">{d.title}</h3>
      {d.description && <p className="text-[15px] md:text-[16px] text-black font-light leading-relaxed mb-6 whitespace-pre-line">{d.description}</p>}
      {d.scrollLabel && <div className="text-[11px] uppercase tracking-[0.18em] text-warm-500 mb-2">{d.scrollLabel}</div>}
      {d.ctas && d.ctas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {d.ctas.map((c, i) => <CtaButton key={i} cta={c} />)}
        </div>
      )}
    </div>
  );
  const bulletsEl = d.bullets && d.bullets.filter(Boolean).length > 0 ? (
    <div className="px-6 py-10 md:px-10 md:py-12 md:border-l border-warm-100">
      {d.bulletsTitle && <div className="text-[11px] uppercase tracking-[0.18em] text-warm-500 mb-4">{d.bulletsTitle}</div>}
      <ul className="space-y-2">
        {d.bullets.filter(Boolean).map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px] text-black font-light">
            <span className="text-warm-400 mt-1.5">&bull;</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <section className="w-full bg-warm-50/40 my-3">
      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
        {imgLeft ? (
          <>
            <div className="md:col-span-4">{imageEl}</div>
            <div className={bulletsEl ? "md:col-span-5" : "md:col-span-8"}>{contentEl}</div>
            {bulletsEl && <div className="md:col-span-3">{bulletsEl}</div>}
          </>
        ) : (
          <>
            {bulletsEl && <div className="md:col-span-3">{bulletsEl}</div>}
            <div className={bulletsEl ? "md:col-span-5" : "md:col-span-8"}>{contentEl}</div>
            <div className="md:col-span-4">{imageEl}</div>
          </>
        )}
      </div>
    </section>
  );
}

function CardsRow({ d }: { d: NewsCardsRowData }) {
  const items = d.items || [];
  if (items.length === 0) return null;
  const cols = d.columns || 3;
  const gridCols = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  return (
    <section className="gtv-container py-12 md:py-16">
      {d.sectionTitle && (
        <h2 className="text-center font-sans text-[36px] md:text-[48px] text-black font-bold tracking-tight mb-10 md:mb-14">{d.sectionTitle}</h2>
      )}
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {items.map((it, i) => {
          const num = d.autoNumber === false ? (it.number || "") : `${String(i + 1).padStart(2, "0")}.`;
          return (
            <div key={i} className="bg-warm-50/60 px-8 py-12 md:px-10 md:py-14 flex flex-col">
              {it.iconUrl && (
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-10">
                  <span className="relative w-7 h-7">
                    <Image src={it.iconUrl} alt="" fill className="object-contain invert" sizes="28px" />
                  </span>
                </div>
              )}
              {num && <div className="text-[14px] text-black/60 mb-3 font-light">{num}</div>}
              <h3 className="font-sans text-[28px] md:text-[32px] text-black font-bold leading-tight mb-4 tracking-tight">{it.title}</h3>
              {it.description && <p className="text-[15px] text-black font-light leading-relaxed">{it.description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FaqBlock({ d }: { d: NewsFaqData }) {
  const items = d.items || [];
  if (items.length === 0) return null;
  return (
    <section className="gtv-container py-12 md:py-16">
      {d.sectionTitle && (
        <h2 className="text-center font-sans text-[28px] md:text-[36px] text-black font-bold tracking-tight mb-10">{d.sectionTitle}</h2>
      )}
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((it, i) => (
          <details key={i} className="group bg-warm-50/60 border border-warm-100 rounded-lg overflow-hidden">
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 hover:bg-warm-100/50 transition-colors">
              <span className="text-[15px] md:text-[16px] text-black font-medium">{it.question}</span>
              <span className="text-warm-500 text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="px-5 py-4 border-t border-warm-100 text-[15px] text-black/80 font-light leading-relaxed whitespace-pre-line">{it.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function StatsBlock({ d }: { d: NewsStatsData }) {
  const items = d.items || [];
  if (items.length === 0) return null;
  const cols = d.columns || 3;
  const gridCols = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  return (
    <section className="gtv-container py-12 md:py-16">
      {d.sectionTitle && (
        <h2 className="text-center font-sans text-[28px] md:text-[36px] text-black font-bold tracking-tight mb-10">{d.sectionTitle}</h2>
      )}
      <div className={`grid grid-cols-2 ${gridCols} gap-6 md:gap-10`}>
        {items.map((s, i) => (
          <div key={i} className="text-center">
            <div className="font-serif text-[40px] md:text-[64px] text-black font-light leading-none mb-3 tabular-nums">{s.value}</div>
            <div className="text-[13px] md:text-[14px] uppercase tracking-[0.12em] text-warm-700">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteBlock({ d }: { d: NewsQuoteData }) {
  if (!d.text) return null;
  const isCenter = d.align !== "left";
  return (
    <section className="gtv-container py-12 md:py-16">
      <blockquote className={`max-w-3xl mx-auto ${isCenter ? "text-center" : "text-left"}`}>
        <div className="text-[24px] md:text-[32px] font-serif italic text-black leading-snug mb-6">&ldquo;{d.text}&rdquo;</div>
        {(d.author || d.authorRole) && (
          <footer className="text-[14px] text-warm-700 uppercase tracking-[0.12em]">
            {d.author && <span className="font-semibold text-black">{d.author}</span>}
            {d.author && d.authorRole && <span className="mx-2">&middot;</span>}
            {d.authorRole && <span>{d.authorRole}</span>}
          </footer>
        )}
      </blockquote>
    </section>
  );
}

function TimelineBlock({ d }: { d: NewsTimelineData }) {
  const items = d.items || [];
  if (items.length === 0) return null;
  return (
    <section className="gtv-container py-12 md:py-16">
      {d.sectionTitle && (
        <h2 className="text-center font-sans text-[28px] md:text-[36px] text-black font-bold tracking-tight mb-10">{d.sectionTitle}</h2>
      )}
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-warm-200 md:-translate-x-px" aria-hidden="true" />
        {items.map((it, i) => {
          const right = i % 2 === 1;
          return (
            <div key={i} className={`relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 ${right ? "md:[direction:rtl]" : ""}`}>
              <div className="absolute left-4 md:left-1/2 top-2 w-3 h-3 rounded-full bg-black -translate-x-1/2" aria-hidden="true" />
              <div className={`pl-10 md:pl-0 ${right ? "md:pr-10 md:[direction:ltr] md:text-left" : "md:pr-10 md:text-right"}`}>
                <div className="text-[14px] uppercase tracking-[0.12em] text-warm-500 font-semibold">{it.date}</div>
                <div className="font-sans text-[20px] md:text-[24px] text-black font-medium mt-1">{it.title}</div>
              </div>
              <div className={`pl-10 md:pl-0 md:[direction:ltr] ${right ? "md:text-left md:pl-10" : "md:text-left md:pl-10"}`}>
                {it.description && <p className="text-[15px] text-black/80 font-light leading-relaxed">{it.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ComparisonTableBlock({ d }: { d: NewsComparisonTableData }) {
  const cols = d.columnHeaders || [];
  const rows = d.rows || [];
  if (cols.length === 0 || rows.length === 0) return null;
  const hl = typeof d.highlightColumn === "number" ? d.highlightColumn : -1;
  return (
    <section className="gtv-container py-12 md:py-16">
      {d.sectionTitle && (
        <h2 className="text-center font-sans text-[28px] md:text-[36px] text-black font-bold tracking-tight mb-10">{d.sectionTitle}</h2>
      )}
      <div className="max-w-5xl mx-auto overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left px-4 py-3 font-medium">&nbsp;</th>
              {cols.map((c, i) => (
                <th key={i} className={`text-center px-4 py-3 font-semibold ${i === hl ? "bg-warm-50" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-warm-200">
                <td className="px-4 py-3 text-black font-light text-left">{r.label}</td>
                {cols.map((_, ci) => (
                  <td key={ci} className={`text-center px-4 py-3 ${ci === hl ? "bg-warm-50" : ""}`}>{r.values[ci] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
