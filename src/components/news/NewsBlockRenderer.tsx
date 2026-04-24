"use client";

import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import type {
  NewsBlock,
  TextBlockData,
  ImageBlockData,
  ImageTextBlockData,
  GalleryBlockData,
  SlideshowBlockData,
  QuoteBlockData,
  VideoBlockData,
  SeparatorBlockData,
} from "@/types";

/* ── Fade-in animation wrapper ─────────────────────────── */
function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Text Block ──────────────────────────────────────────── */
function TextBlock({ data }: { data: TextBlockData }) {
  return (
    <section className="py-16 md:py-24">
      <FadeIn className="gtv-container-narrow">
        {data.title && (
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-dark leading-[1.15] mb-8 text-center">
            {data.title}
          </h2>
        )}
        {data.body && (
          <div
            className="text-lg text-dark leading-[1.8] font-light prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
        )}
      </FadeIn>
    </section>
  );
}

/* ── Image Block ─────────────────────────────────────────── */
function ImageBlock({ data }: { data: ImageBlockData }) {
  if (!data.images || data.images.length === 0) return null;

  if (data.layout === "side-by-side" && data.images.length >= 2) {
    return (
      <section className="py-10 md:py-16">
        <FadeIn className="px-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {data.images.slice(0, 2).map((img, i) => (
              <div key={i} className="relative aspect-[16/10] bg-warm-100 overflow-hidden">
                <Image src={img} alt="" fill className="object-cover" sizes="50vw" />
              </div>
            ))}
          </div>
          {data.caption && (
            <p className="text-xs text-warm-400 mt-3 text-center">{data.caption}</p>
          )}
        </FadeIn>
      </section>
    );
  }

  const containerClass = data.layout === "contained" ? "gtv-container-narrow" : "px-4 md:px-6";

  return (
    <section className="py-10 md:py-16">
      <FadeIn className={containerClass}>
        <div className="relative aspect-[16/9] bg-warm-100 overflow-hidden">
          <Image src={data.images[0]} alt="" fill className="object-cover" sizes="100vw" />
        </div>
        {data.caption && (
          <p className="text-xs text-warm-400 mt-3 text-center">{data.caption}</p>
        )}
      </FadeIn>
    </section>
  );
}

/* ── Image + Text Block (full-height like "Born in Vienna") ── */
function ImageTextBlock({ data }: { data: ImageTextBlockData }) {
  const isImageLeft = data.imagePosition === "left";

  const imageEl = (
    <div className="relative bg-warm-200 min-h-[400px]">
      {data.images?.[0] && (
        <Image
          src={data.images[0]}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      )}
    </div>
  );

  const textEl = (
    <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
      {data.title && (
        <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-dark uppercase tracking-wide font-light">
          {data.title}
        </h2>
      )}
      {data.text && (
        <div
          className="text-lg text-dark leading-[1.8] font-light mt-5 prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: data.text }}
        />
      )}
    </div>
  );

  return (
    <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
        {isImageLeft ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}

/* ── Gallery Block ───────────────────────────────────────── */
function GalleryBlock({ data }: { data: GalleryBlockData }) {
  if (!data.images || data.images.length === 0) return null;

  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  }[data.columns] || "grid-cols-3";

  return (
    <section className="py-10 md:py-16">
      <FadeIn className="px-4 md:px-6">
        <div className={`grid ${colsClass} gap-3 md:gap-4`}>
          {data.images.map((img, i) => (
            <div key={i} className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
              <Image
                src={img}
                alt=""
                fill
                className="object-cover"
                sizes={`(max-width: 768px) ${100 / Math.min(data.columns, 2)}vw, ${100 / data.columns}vw`}
              />
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── Slideshow Block (vertical images, horizontal scroll like InspirationCarousel) */
function SlideshowBlock({ data }: { data: SlideshowBlockData }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleFraction, setVisibleFraction] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const total = data.images?.length || 0;

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vf = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    setVisibleFraction(Math.min(1, Math.max(0.05, vf)));
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setScrollProgress(0); return; }
    const sp = el.scrollLeft < 3 ? 0 : el.scrollLeft > maxScroll - 3 ? 1 : el.scrollLeft / maxScroll;
    setScrollProgress(sp);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
    return () => {
      el.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [updateProgress]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft.current - (x - startX.current) * 1.5;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  if (total === 0) return null;

  return (
    <section className="pt-8 pb-16 lg:pb-24">
      <div className="relative">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex gap-4 lg:gap-6 overflow-x-auto px-4 lg:px-6 pb-2 ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {data.images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="flex-shrink-0"
            >
              <div
                className="relative bg-warm-100 overflow-hidden"
                style={{ width: "calc(33vw - 16px)", minWidth: "280px", aspectRatio: "3 / 4" }}
              >
                <Image src={img} alt="" fill className="object-cover" draggable={false} sizes="33vw" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {total > 1 && visibleFraction < 0.999 && (
        <div className="max-w-[780px] mx-auto mt-8 px-4">
          <div className="relative h-[1px] bg-warm-200 w-full">
            <div
              className="absolute bg-warm-900"
              style={{
                top: "-0.5px",
                height: "2px",
                width: `${visibleFraction * 100}%`,
                left: `${Math.max(0, Math.min(1, scrollProgress)) * (1 - visibleFraction) * 100}%`,
                transition: "left 150ms ease-out, width 200ms ease-out",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Quote Block ─────────────────────────────────────────── */
function QuoteBlock({ data }: { data: QuoteBlockData }) {
  const isHandwritten = data.style === "handwritten";

  return (
    <section className="py-20 md:py-32">
      <FadeIn className="gtv-container-narrow text-center">
        <blockquote
          className={`${
            isHandwritten
              ? "font-serif italic text-2xl md:text-3xl lg:text-4xl leading-[1.4]"
              : "font-serif text-2xl md:text-3xl lg:text-4xl leading-[1.3]"
          } text-dark`}
        >
          &ldquo;{data.text}&rdquo;
        </blockquote>
        {data.author && (
          <p className="mt-6 text-sm uppercase tracking-[0.15em] text-warm-500 font-light">
            — {data.author}
          </p>
        )}
      </FadeIn>
    </section>
  );
}

/* ── Video Block ─────────────────────────────────────────── */
function VideoBlock({ data }: { data: VideoBlockData }) {
  if (!data.url) return null;

  let embedUrl = data.url;
  const ytMatch = data.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = data.url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return (
    <section className="py-16 md:py-24">
      <FadeIn className="mx-auto w-[95%] max-w-[85%]">
        <div className="relative w-full bg-warm-100 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {data.caption && (
          <p className="text-xs text-warm-400 mt-3 text-center">{data.caption}</p>
        )}
      </FadeIn>
    </section>
  );
}

/* ── Separator Block ─────────────────────────────────────── */
function SeparatorBlock({ data }: { data: SeparatorBlockData }) {
  const heightMap = { small: "py-6", medium: "py-12", large: "py-24" };
  return <div className={heightMap[data.height] || "py-12"} />;
}

/* ── Main Renderer ───────────────────────────────────────── */
export default function NewsBlockRenderer({ block }: { block: NewsBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock data={block.data as TextBlockData} />;
    case "image":
      return <ImageBlock data={block.data as ImageBlockData} />;
    case "image_text":
      return <ImageTextBlock data={block.data as ImageTextBlockData} />;
    case "gallery":
      return <GalleryBlock data={block.data as GalleryBlockData} />;
    case "slideshow":
      return <SlideshowBlock data={block.data as SlideshowBlockData} />;
    case "quote":
      return <QuoteBlock data={block.data as QuoteBlockData} />;
    case "video":
      return <VideoBlock data={block.data as VideoBlockData} />;
    case "separator":
      return <SeparatorBlock data={block.data as SeparatorBlockData} />;
    default:
      return null;
  }
}
