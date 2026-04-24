"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import type { Product, Designer, Project } from "@/types";
import { buildPconUrl } from "@/lib/pcon";
import { useLang, useT } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";
import { localizeHref } from "@/lib/localize-href";
import GallerySlideshow from "@/components/site/GallerySlideshow";

interface ProductDetail extends Omit<Product, "projects"> {
  related: (Product & { designer?: Designer })[];
  projects: Project[];
}

/* ─── Inspiration Carousel sub-component ─── */
function InspirationCarousel({ images, productName, id }: { images: string[]; productName: string; id?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleFraction, setVisibleFraction] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [altMap, setAltMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (images.length === 0) return;
    fetch("/api/media/alt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: images }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAltMap(d.data || {}); })
      .catch(() => { /* silent */ });
  }, [images]);

  const ARROW_CURSOR = hoverSide === "left"
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M28 22 L16 22 M21 17 L16 22 L21 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : hoverSide === "right"
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M16 22 L28 22 M23 17 L28 22 L23 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : "pointer";

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vf = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    setVisibleFraction(Math.min(1, Math.max(0.05, vf)));
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setScrollProgress(0); return; }
    setScrollProgress(el.scrollLeft / maxScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
    return () => {
      el.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [updateProgress]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (isDragging) {
      const x = e.pageX - el.offsetLeft;
      const delta = x - startX;
      if (Math.abs(delta) > 4) {
        e.preventDefault();
        el.scrollLeft = scrollLeft - delta * 1.5;
      }
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    if (cx < rect.width / 3) setHoverSide("left");
    else if (cx > (rect.width * 2) / 3) setHoverSide("right");
    else setHoverSide(null);
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (el && isDragging) {
      const moved = Math.abs(e.pageX - el.offsetLeft - startX);
      if (moved < 5) {
        const firstCard = el.querySelector<HTMLElement>("[data-slide-card]");
        const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : el.clientWidth / 3;
        const gap = window.innerWidth >= 1024 ? 24 : 16;
        const step = cardWidth + gap;
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        if (cx < rect.width / 3) el.scrollBy({ left: -step, behavior: "smooth" });
        else if (cx > (rect.width * 2) / 3) el.scrollBy({ left: step, behavior: "smooth" });
      }
    }
    setIsDragging(false);
  };

  if (images.length === 0) return null;

  return (
    <section id={id} className="pb-16 lg:pb-24">
      <div className="relative">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => { handleMouseUp(e); setHoverSide(null); }}
          className={`flex gap-4 lg:gap-6 overflow-x-auto px-4 lg:px-6 pb-2 snap-x snap-mandatory scroll-smooth ${isDragging ? "select-none" : ""}`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: ARROW_CURSOR }}
        >
          {images.map((url, i) => (
            <div
              key={i}
              data-slide-card
              className="flex-shrink-0 snap-start"
            >
              <div
                className="relative overflow-hidden w-[85vw] max-w-[360px] sm:w-[calc(50vw-24px)] sm:max-w-[420px] lg:w-[calc((100vw-96px)/3)] lg:max-w-[480px]"
                style={{ aspectRatio: "2.5 / 4" }}
              >
                <Image
                  src={url}
                  alt={altMap[url] || `${productName} ispirazione ${i + 1}`}
                  fill
                  className="object-cover"
                  draggable={false}
                  sizes="45vw"
                />
                {/* Tooltip bubble */}
                {activeTooltip === i && (
                  <div className="absolute bottom-14 left-4 bg-white text-warm-900 text-xs px-3 py-2 rounded shadow-md max-w-[250px] leading-snug">
                    {altMap[url] || `${productName} ispirazione ${i + 1}`}
                    <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white rotate-45" />
                  </div>
                )}
                <button
                  className="absolute bottom-4 left-4 w-7 h-7 rounded-full bg-white text-warm-900 text-xs font-serif flex items-center justify-center hover:bg-warm-100 transition-colors shadow-sm"
                  onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === i ? null : i); }}
                >
                  i
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar — la parte nera rappresenta la frazione visibile dello slider */}
      <div className="px-10 lg:px-16 mt-8">
        <div className="relative h-[1px] bg-warm-200 w-full">
          <div
            className="absolute top-0 h-full bg-warm-800 transition-all duration-150 ease-out"
            style={{
              width: `${visibleFraction * 100}%`,
              left: `${scrollProgress * (1 - visibleFraction) * 100}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const lang = useLang();
  const t = useT();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [supportImg, setSupportImg] = useState("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&q=80");
  const [imageOrientations, setImageOrientations] = useState<Record<string, "h" | "v">>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/products/slug?slug=${slug}&lang=${lang}`);
      const json = await res.json();
      if (json.success) {
        setProduct(json.data);
      }
      setLoading(false);
    }
    load();
    fetch("/api/page-images?page=prodotti-dettaglio").then(r => r.json()).then(d => {
      const img = (d.data || []).find((i: { section: string }) => i.section === "supporto-professionisti");
      if (img?.imageUrl) setSupportImg(img.imageUrl);
    });
  }, [slug, lang]);

  // Manual orientation overrides from admin (galleryOrientations JSON: {url: "h"|"v"})
  const manualOrientations: Record<string, "h" | "v"> = useMemo(() => {
    if (!product?.galleryOrientations) return {};
    try {
      const parsed = JSON.parse(product.galleryOrientations);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch { return {}; }
  }, [product?.galleryOrientations]);

  // Measure image orientations for gallery split — only for URLs without a manual override.
  useEffect(() => {
    if (!product?.galleryImages) return;
    let urls: string[] = [];
    try { urls = JSON.parse(product.galleryImages); } catch { /* ignore */ }
    if (urls.length === 0) return;
    let cancelled = false;
    urls.forEach((url) => {
      if (manualOrientations[url]) return;
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        const orient: "h" | "v" = img.naturalWidth >= img.naturalHeight ? "h" : "v";
        setImageOrientations((prev) => (prev[url] ? prev : { ...prev, [url]: orient }));
      };
      img.src = url;
    });
    return () => { cancelled = true; };
  }, [product?.galleryImages, manualOrientations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-warm-500">{lang === "en" ? "Product not found" : lang === "de" ? "Produkt nicht gefunden" : lang === "fr" ? "Produit introuvable" : "Prodotto non trovato"}</p>
        <Link href={localizePath("/prodotti", lang)} className="gtv-link">{t("common.back")}</Link>
      </div>
    );
  }

  const gallery: string[] = (() => {
    try {
      if (product.galleryImages) return JSON.parse(product.galleryImages);
    } catch { /* ignore */ }
    return [];
  })();
  // Split gallery by orientation — manual overrides from admin take precedence, else auto-measured.
  const resolvedOrientation = (u: string): "h" | "v" | undefined =>
    manualOrientations[u] || imageOrientations[u];
  const horizontalGallery = gallery.filter((u) => resolvedOrientation(u) !== "v");
  const verticalGallery = gallery.filter((u) => resolvedOrientation(u) === "v");
  const hasAnyGallery = horizontalGallery.length > 0 || verticalGallery.length > 0;
  const heroImg = product.heroImage || product.coverImage || product.imageUrl;
  const sideImg = product.sideImage || product.coverImage || product.imageUrl;

  const sectionNav = [
    ...(hasAnyGallery ? [{ label: t("prodotti.detail.nav.inspiration"), id: "ispirazione" }] : []),
    { label: t("prodotti.detail.nav.designer"), id: "designer" },
    { label: t("prodotti.detail.nav.specs"), id: "specifiche" },
    { label: t("prodotti.detail.nav.projects"), id: "progetti" },
  ];

  return (
    <>
      {/* ===== 1. HERO — responsive height, 16/9 + 50px ===== */}
      <section className="relative w-full overflow-hidden" style={{ height: "min(118vh, 1107px)" }}>
        <Image
          src={heroImg}
          alt={product.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black" style={{ opacity: 0.6 }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <h1 className="font-serif text-[58px] text-white tracking-wide">
            {product.name}
          </h1>
          <p className="uppercase text-[20px] tracking-[0.08em] text-white mt-2 font-light">
            by {product.designerName}{product.year ? ` | ${product.year}` : ""}
          </p>
        </motion.div>
      </section>

      {/* ===== 2. DESCRIPTION — split layout like homepage FeaturedProduct ===== */}
      <section className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left — tall contextual image (no hover zoom) */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative overflow-hidden"
            style={{ aspectRatio: "3 / 4.2" }}
          >
            <Image
              src={sideImg}
              alt={`${product.name} ambiance`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          {/* Right — description + actions, vertically centered */}
          <div className="flex flex-col justify-center px-0 md:px-16 lg:px-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {product.description && (
                <div
                  className="text-[20px] text-black leading-snug font-light tracking-normal max-w-none overflow-hidden [&_p]:m-0"
                  style={{ ...(!descExpanded ? { maxHeight: "5.6em" } : {}) }}
                  dangerouslySetInnerHTML={{ __html: product.description.includes("<") ? product.description : `<p>${product.description}</p>` }}
                />
              )}

              <button
                className="inline-block mt-[20px] uppercase text-xs tracking-[0.08em] text-warm-900 font-light border-b border-warm-900 pb-1"
                onClick={() => setDescExpanded(!descExpanded)}
              >
                {descExpanded ? t("prodotti.detail.show_less") : t("prodotti.detail.show_more")}
              </button>

              {/* Dimensioni / Varianti buttons */}
              <div className="flex items-center gap-8 mt-10">
                <button
                  onClick={() => document.getElementById("specifiche")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-3 text-sm uppercase tracking-[0.1em] text-warm-900 hover:underline"
                  style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path d="M3 7l4-4 14 14-4 4L3 7z" />
                    <path d="M7 3l2 2M10 6l1.5 1.5M13 9l2 2M16 12l1.5 1.5" />
                  </svg>
                  {t("prodotti.detail.dimensions")}
                </button>
                <button
                  onClick={() => document.getElementById("ispirazione")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-3 text-sm uppercase tracking-[0.1em] text-warm-900 hover:underline"
                  style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <rect x="2" y="4" width="13" height="16" rx="0.5" />
                    <rect x="9" y="4" width="13" height="16" rx="0.5" />
                  </svg>
                  {t("prodotti.detail.variants")}
                </button>
              </div>

              {/* CTA links */}
              <div className="mt-12 flex flex-col gap-6">
                <Link
                  href={localizePath("/contatti/rete-vendita", lang)}
                  className="inline-block uppercase text-[16px] tracking-[0.03em] text-warm-900 font-medium hover:underline"
                  style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                >
                  {t("prodotti.detail.find_store")} →
                </Link>
                <Link
                  href={localizePath("/contatti/richiesta-info", lang)}
                  className="inline-block uppercase text-[16px] tracking-[0.03em] text-warm-900 font-medium hover:underline"
                  style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                >
                  {t("prodotti.detail.request_info")} →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. SECTION NAV — 4 anchor links ===== */}
      <nav className="sticky top-0 z-30 bg-white">
        <div className="gtv-container flex items-center justify-center gap-10 lg:gap-16" style={{ paddingTop: "5rem", paddingBottom: "5rem" }}>
          {sectionNav.map((item) => (
            <button
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
              className="uppercase text-[16px] tracking-[0.03em] text-black font-light hover:underline"
              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== 4. ISPIRAZIONE — horizontal slideshow + vertical carousel ===== */}
      {horizontalGallery.length > 0 && (
        <GallerySlideshow
          images={horizontalGallery}
          name={product.name}
          id="ispirazione"
        />
      )}
      {verticalGallery.length > 0 && (
        <InspirationCarousel
          images={verticalGallery}
          productName={product.name}
          id={horizontalGallery.length === 0 ? "ispirazione" : undefined}
        />
      )}

      {/* ===== 5. DESIGNER SECTION ===== */}
      <section id="designer">
        {product.designer && (
          <div style={{ backgroundColor: "#f9f8f6" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
              {/* Designer photo */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative overflow-hidden"
                style={{ aspectRatio: "3 / 4.2" }}
              >
                <Image
                  src={product.designer.imageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop&crop=face"}
                  alt={product.designer.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </motion.div>

              {/* Designer info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col justify-center px-0 md:px-16 lg:px-[150px] py-16 lg:py-24"
              >
                <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light">{t("prodotti.detail.designer.label")}</p>
                <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                  {product.designer.name}
                </h2>
                {product.designer.bio && (
                  <div
                    className="text-[20px] text-black leading-snug font-light tracking-normal max-w-none mt-6 [&_p]:m-0"
                    dangerouslySetInnerHTML={{ __html: product.designer.bio.includes("<") ? product.designer.bio : `<p>${product.designer.bio}</p>` }}
                  />
                )}
                <Link
                  href={localizePath(`/designers/${product.designer.slug || product.designer.id}`, lang)}
                  className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-warm-900 font-medium hover:underline"
                  style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
                >
                  {t("prodotti.detail.designer.cta")}
                </Link>
              </motion.div>
            </div>
          </div>
        )}
      </section>

      {/* White space separator */}
      <div className="h-16 lg:h-24 bg-white" />

      {/* ===== 6. SPECIFICHE TECNICHE — Accordion ===== */}
      <section id="specifiche" style={{ backgroundColor: "#f9f8f6" }}>
        <div className="gtv-container py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="font-sans text-[38px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {t("prodotti.detail.nav.specs")}
              </h2>
            </div>

            {/* Accordion rows */}
            <div className="divide-y divide-black border-t border-b border-black">

              {/* --- DIMENSIONI --- */}
              <div>
                <button
                  onClick={() => setOpenAccordion(openAccordion === "dimensioni" ? null : "dimensioni")}
                  className="w-full flex items-center justify-between py-5 px-2 group"
                >
                  <span className="uppercase text-[20px] tracking-[0.03em] text-black font-light">
                    {t("prodotti.detail.dimensions")}
                  </span>
                  <span className="w-10 h-10 border border-black flex items-center justify-center text-black flex-shrink-0">
                    {openAccordion === "dimensioni" ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                <AnimatePresence>
                  {openAccordion === "dimensioni" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-8">
                        {(() => {
                          const allSets: { name?: string | null; image?: string | null; values?: string | null; freeText?: string | null }[] = [
                            { image: product.dimensionImage, values: product.dimensionValues, freeText: product.dimensions, name: null },
                            ...((product.extraDimensions || []).map((d) => ({ image: d.image, values: d.values, freeText: d.freeText, name: d.name }))),
                          ].filter((s) => s.image || (s.values && s.values !== "{}") || s.freeText);
                          if (allSets.length === 0) {
                            return <p className="text-[16px] text-warm-500">{t("prodotti.detail.dims_unavailable")}</p>;
                          }
                          return (
                            <div className="space-y-8">
                              {allSets.map((s, setIdx) => (
                                <div key={setIdx} className={setIdx > 0 ? "pt-8 border-t border-warm-200" : ""}>
                                  {s.name && (
                                    <p className="text-[14px] text-black font-semibold uppercase tracking-wider mb-4">{s.name}</p>
                                  )}
                                  <div className="flex flex-col md:flex-row items-start gap-8">
                                    {s.image && (
                                      <div className="relative bg-white p-4 w-full md:w-1/2 md:flex-none min-w-0" style={{ aspectRatio: "3 / 2" }}>
                                        <Image src={s.image} alt={`${product.name} dimensioni`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                                      </div>
                                    )}
                                    <div className={s.image ? "w-full md:flex-1 md:min-w-[200px]" : "w-full"}>
                                      {s.values && s.values !== "{}" ? (() => {
                                        try {
                                          const vals: Record<string, string> = JSON.parse(s.values);
                                          const entries = Object.entries(vals).filter(([, v]) => v);
                                          if (entries.length === 0) return null;
                                          return (
                                            <div className="space-y-3">
                                              {entries.map(([label, value]) => (
                                                <div key={label}>
                                                  <p className="text-[16px] text-black font-bold uppercase tracking-wider mb-0.5">{label}</p>
                                                  <p className="text-[16px] text-warm-800">{value}</p>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        } catch { return null; }
                                      })() : s.freeText ? (
                                        <div>
                                          {s.freeText.split("\n").map((line, i) => (
                                            <p key={i} className="text-[16px] text-warm-800 leading-relaxed">
                                              {line || "\u00A0"}
                                            </p>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* --- DOCUMENTAZIONE --- */}
              <div>
                <button
                  onClick={() => setOpenAccordion(openAccordion === "scheda" ? null : "scheda")}
                  className="w-full flex items-center justify-between py-5 px-2 group"
                >
                  <span className="uppercase text-[20px] tracking-[0.03em] text-black font-light">
                    {t("prodotti.detail.tech_section_title")}
                  </span>
                  <span className="w-10 h-10 border border-black flex items-center justify-center text-black flex-shrink-0">
                    {openAccordion === "scheda" ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                <AnimatePresence>
                  {openAccordion === "scheda" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-8">
                        <div className="flex flex-wrap gap-12 pt-4">
                          {product.techSheetUrl && (
                            <a href={product.techSheetUrl} target="_blank" rel="noopener noreferrer"
                              className="uppercase text-sm tracking-[0.1em] text-warm-900 font-medium hover:underline"
                              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>
                              {t("prodotti.detail.tech_sheet_download")} ↓
                            </a>
                          )}
                          {product.model2dUrl && (
                            <a href={product.model2dUrl} download
                              className="uppercase text-sm tracking-[0.1em] text-warm-900 font-medium hover:underline"
                              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>
                              {t("prodotti.detail.model_2d")} ↓
                            </a>
                          )}
                          {product.model3dUrl && (
                            <a href={product.model3dUrl} download
                              className="uppercase text-sm tracking-[0.1em] text-warm-900 font-medium hover:underline"
                              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}>
                              {t("prodotti.detail.model_3d")} ↓
                            </a>
                          )}
                        </div>
                        {!product.techSheetUrl && !product.model2dUrl && !product.model3dUrl && (
                          <div className="pt-4">
                            <p className="text-sm text-warm-400 font-light">
                              {t("prodotti.detail.docs.unavailable")}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== 6b. PCON 3D VIEWER — eager-loaded full-width section ===== */}
      {(() => {
        const pconSrc = product.pconBan
          ? buildPconUrl({
              moc: product.pconMoc,
              ban: product.pconBan,
              sid: product.pconSid,
              ovc: product.pconOvc,
            })
          : product.pconUrl || null;
        if (!pconSrc) return null;
        return (
          <section id="pcon" className="bg-white py-16 lg:py-24">
            <div className="gtv-container">
              <div className="text-center mb-12">
                <h2 className="font-sans text-[38px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                  {t("prodotti.detail.pcon.title")}
                </h2>
              </div>
            </div>
            <iframe
              src={pconSrc}
              className="block w-full border-0"
              style={{ height: "640px" }}
              allowFullScreen
              allow="xr-spatial-tracking"
              loading="eager"
              title={`Visualizzatore 3D ${product.name}`}
            />
          </section>
        );
      })()}

      {/* ===== 7. PROJECT REFERENCE — first project where this product is used ===== */}
      <section id="progetti" className="mt-16 lg:mt-24">
        {product.projects && product.projects.length > 0 && (() => {
          const proj = product.projects[0];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
                style={{ aspectRatio: "1 / 1" }}
              >
                <Image
                  src={proj.imageUrl}
                  alt={proj.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
                <div className="absolute top-0 left-0 right-0 p-8 lg:p-12">
                  {proj.country && (
                    <p className="uppercase text-[16px] tracking-[0.03em] text-white/70 font-light mb-1.5">
                      {proj.country}
                    </p>
                  )}
                  <h3 className="font-sans text-[28px] text-white leading-[1.15] font-light uppercase tracking-[inherit]">
                    {proj.name}
                  </h3>
                  <Link
                    href={localizePath(`/progetti/${proj.slug}`, lang)}
                    className="inline-block uppercase text-[16px] tracking-[0.03em] text-white font-medium hover:underline mt-6"
                    style={{ textUnderlineOffset: "8px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
                  >
                    {t("prodotti.detail.discover_more")}
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col justify-center bg-white"
                style={{ padding: "72px 80px 72px 160px" }}
              >
                <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">{t("prodotti.detail.projects.label")}</p>
                <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                  {t("prodotti.detail.projects.title").replace("{name}", product.name)}
                </h3>
                <div className="flex flex-col gap-4 mt-8">
                  <Link
                    href={localizeHref(`/progetti?_proj_product=${product.slug}`, lang)}
                    className="inline-block uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline"
                    style={{ textUnderlineOffset: "8px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
                  >
                    {t("prodotti.detail.projects.cta")}
                  </Link>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </section>

      {/* ===== 8. SUPPORTO AI PROFESSIONISTI — split text + image ===== */}
      <section className="w-full mt-[30px]">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center px-0 md:px-16 lg:pl-[135px] lg:pr-20 py-16 lg:py-24 bg-white"
          >
            <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light">{t("prodotti.detail.support.label")}</p>
            <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit] whitespace-pre-line">
              {t("prodotti.detail.support.title")}
            </h2>
            <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-6">
              {t("prodotti.detail.support.description")}
            </p>

            {/* 3 feature icons */}
            <div className="flex items-start gap-8 mt-10">
              <div className="flex flex-col items-start text-left max-w-[100px]">
                <svg className="w-7 h-7 text-black mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <path d="M3 9h18M9 3v18" />
                  <path d="M7 13l2 2 4-4" />
                </svg>
                <p className="text-[14px] text-black font-light leading-tight">{t("prodotti.detail.support.feature1")}</p>
              </div>
              <div className="flex flex-col items-start text-left max-w-[100px]">
                <svg className="w-7 h-7 text-black mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="6" width="8" height="12" rx="1" />
                  <rect x="14" y="6" width="8" height="12" rx="1" />
                  <path d="M6 10h0M6 14h0M18 10h0M18 14h0" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <p className="text-[14px] text-black font-light leading-tight">{t("prodotti.detail.support.feature2")}</p>
              </div>
              <div className="flex flex-col items-start text-left max-w-[100px]">
                <svg className="w-7 h-7 text-black mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <p className="text-[14px] text-black font-light leading-tight">{t("prodotti.detail.support.feature3")}</p>
              </div>
            </div>

            <Link
              href={localizePath("/contatti/richiesta-info", lang)}
              className="inline-block mt-10 uppercase text-[16px] tracking-[0.03em] text-warm-900 font-medium hover:underline"
              style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
            >
              {t("prodotti.detail.support.cta")}
            </Link>
          </motion.div>

          {/* Right — lifestyle image */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden"
            style={{ aspectRatio: "1 / 1" }}
          >
            <Image
              src={supportImg}
              alt="Supporto professionisti"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </section>

      {/* ===== 9. BREADCRUMBS ===== */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href={localizePath("/", lang)}>{t("common.breadcrumb_home")}</Link>
          <span>&gt;</span>
          <Link href={localizePath("/prodotti", lang)}>{t("prodotti.breadcrumb")}</Link>
          <span>&gt;</span>
          <span>{product.name}</span>
        </div>
      </div>
    </>
  );
}
