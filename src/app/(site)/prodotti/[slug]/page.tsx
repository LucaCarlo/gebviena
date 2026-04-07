"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ChevronRight } from "lucide-react";
import type { Product, Designer, Project } from "@/types";

interface ProductDetail extends Omit<Product, "projects"> {
  related: (Product & { designer?: Designer })[];
  projects: Project[];
}

/* ─── Inspiration Carousel sub-component ─── */
function InspirationCarousel({ images, productName }: { images: string[]; productName: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setScrollProgress(0); return; }
    setScrollProgress(el.scrollLeft / maxScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => el.removeEventListener("scroll", updateProgress);
  }, [updateProgress]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };
  const handleMouseUp = () => setIsDragging(false);

  if (images.length === 0) return null;

  return (
    <section id="ispirazione" className="pt-8 pb-16 lg:pb-24">
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
          {images.map((url, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="flex-shrink-0"
            >
              <div
                className="relative img-hover"
                style={{ width: "calc(33vw - 16px)", minWidth: "280px", aspectRatio: "3 / 4" }}
              >
                <Image
                  src={url}
                  alt={`${productName} ispirazione ${i + 1}`}
                  fill
                  className="object-cover"
                  draggable={false}
                  sizes="33vw"
                />
                <button className="absolute bottom-4 left-4 w-7 h-7 rounded-full border border-white/60 text-white/80 text-xs italic flex items-center justify-center hover:bg-white/20 transition-colors">
                  i
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="gtv-container mt-8">
        <div className="relative h-[1px] bg-warm-200 w-full max-w-3xl mx-auto">
          <div
            className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-150 ease-out"
            style={{
              width: "33%",
              transform: `translateX(${scrollProgress * 200}%)`,
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

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/products/slug?slug=${slug}`);
      const json = await res.json();
      if (json.success) {
        setProduct(json.data);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

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
        <p className="text-warm-500">Prodotto non trovato</p>
        <Link href="/prodotti" className="gtv-link">Torna ai prodotti</Link>
      </div>
    );
  }

  const gallery: string[] = (() => {
    try {
      if (product.galleryImages) return JSON.parse(product.galleryImages);
    } catch { /* ignore */ }
    return [];
  })();
  const variants: { name: string; image: string }[] = (() => {
    try {
      if (product.variants) return JSON.parse(product.variants);
    } catch { /* ignore */ }
    return [];
  })();
  const heroImg = product.heroImage || product.coverImage || product.imageUrl;
  const sideImg = product.sideImage || product.coverImage || product.imageUrl;

  const sectionNav = [
    { label: "Ispirazione", id: "ispirazione" },
    { label: "Designer", id: "designer" },
    { label: "Specifiche Tecniche", id: "specifiche" },
    { label: "Progetti", id: "progetti" },
  ];

  return (
    <>
      {/* ===== 1. HERO — same height/style as homepage (115vh) ===== */}
      <section className="relative w-full overflow-hidden" style={{ height: "115vh" }}>
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
          <p className="uppercase text-sm md:text-base tracking-[0.08em] text-white mt-4 font-light">
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
          <div className="flex flex-col justify-center px-10 md:px-16 lg:px-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {product.description && (
                <div
                  className={`text-[20px] text-black leading-snug font-light tracking-normal prose prose-warm max-w-none ${!descExpanded ? "line-clamp-4" : ""}`}
                  style={{ textAlign: "justify" }}
                  dangerouslySetInnerHTML={{ __html: product.description.includes("<") ? product.description : `<p>${product.description}</p>` }}
                />
              )}

              <button
                className="inline-block mt-[20px] uppercase text-xs tracking-[0.08em] text-warm-900 font-light border-b border-warm-900 pb-1 transition-colors hover:text-warm-600"
                onClick={() => setDescExpanded(!descExpanded)}
              >
                {descExpanded ? "Mostra meno" : "Continua a leggere"}
              </button>

              {/* Dimensioni / Varianti buttons */}
              <div className="flex items-center gap-8 mt-10">
                <button
                  onClick={() => document.getElementById("specifiche")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-3 text-sm uppercase tracking-[0.1em] text-warm-900 hover:text-warm-600 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <path d="M3 7l4-4 14 14-4 4L3 7z" />
                    <path d="M7 3l2 2M10 6l1.5 1.5M13 9l2 2M16 12l1.5 1.5" />
                  </svg>
                  Dimensioni
                </button>
                <button
                  onClick={() => document.getElementById("ispirazione")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-3 text-sm uppercase tracking-[0.1em] text-warm-900 hover:text-warm-600 transition-colors"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                    <rect x="2" y="4" width="13" height="16" rx="0.5" />
                    <rect x="9" y="4" width="13" height="16" rx="0.5" />
                  </svg>
                  Varianti
                </button>
              </div>

              {/* CTA links */}
              <div className="mt-12 space-y-6">
                <Link
                  href="/contatti/rete-vendita"
                  className="flex items-center gap-2 uppercase text-sm tracking-[0.1em] text-warm-900 hover:text-warm-600 transition-colors group"
                >
                  Cerca un punto vendita
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href="/contatti/richiesta-info"
                  className="flex items-center gap-2 uppercase text-sm tracking-[0.1em] text-warm-900 hover:text-warm-600 transition-colors group"
                >
                  Richiedi informazioni
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. SECTION NAV — 4 anchor links ===== */}
      <nav className="sticky top-0 z-30 bg-white">
        <div className="gtv-container flex items-center justify-center gap-10 lg:gap-16 py-4 mt-6">
          {sectionNav.map((item) => (
            <button
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
              className="uppercase text-xs md:text-sm tracking-[0.15em] text-warm-900 hover:underline underline-offset-4 transition-all font-light"
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== 4. ISPIRAZIONE — scrollable carousel ===== */}
      <InspirationCarousel
        images={gallery.length > 0 ? gallery : product.related.map(r => r.imageUrl)}
        productName={product.name}
      />

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
                className="relative img-hover"
                style={{ aspectRatio: "3 / 4" }}
              >
                <Image
                  src={product.designer.imageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop&crop=face"}
                  alt={product.designer.name}
                  fill
                  className="object-cover grayscale"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </motion.div>

              {/* Designer info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col justify-center px-10 md:px-16 lg:px-20 py-16 lg:py-24"
              >
                <p className="uppercase text-[11px] tracking-[0.25em] text-warm-500 mb-3">Designer</p>
                <h2 className="font-sans text-2xl md:text-3xl text-warm-900 font-light uppercase tracking-wide">
                  {product.designer.name}
                </h2>
                {product.designer.country && (
                  <p className="text-sm text-warm-600 mt-2">{product.designer.country}</p>
                )}
                {product.designer.bio && (
                  product.designer.bio.includes("<") ? (
                    <div
                      className="leading-relaxed mt-6 font-light text-sm lg:text-base prose prose-warm max-w-none"
                      style={{ textAlign: "justify", color: "#000000" }}
                      dangerouslySetInnerHTML={{ __html: product.designer.bio }}
                    />
                  ) : (
                    <p className="leading-relaxed mt-6 font-light text-sm lg:text-base" style={{ textAlign: "justify", color: "#000000" }}>
                      {product.designer.bio}
                    </p>
                  )
                )}
                <Link
                  href={`/designer/${product.designer.slug || product.designer.id}`}
                  className="inline-flex items-center gap-2 uppercase text-xs tracking-[0.15em] text-warm-900 hover:text-accent transition-colors group mt-8"
                >
                  Vai alla scheda
                  <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
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
              <h2 className="font-sans text-2xl md:text-3xl text-warm-900 font-light uppercase tracking-[0.15em]">
                Specifiche Tecniche
              </h2>
            </div>

            {/* Accordion rows */}
            <div className="divide-y divide-warm-900 border-t border-b border-warm-900">

              {/* --- VARIANTI PRODOTTO --- */}
              <div>
                <button
                  onClick={() => setOpenAccordion(openAccordion === "varianti" ? null : "varianti")}
                  className="w-full flex items-center justify-between py-5 px-2 group"
                >
                  <span className="uppercase text-xs tracking-[0.15em] text-warm-900 transition-colors">
                    Varianti prodotto
                  </span>
                  <span className="w-8 h-8 border border-warm-900 flex items-center justify-center text-warm-900 flex-shrink-0">
                    {openAccordion === "varianti" ? <Minus size={14} /> : <Plus size={14} />}
                  </span>
                </button>
                <AnimatePresence>
                  {openAccordion === "varianti" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-8">
                        {variants.length > 0 ? (
                          <div className="flex gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                            {variants.map((v, i) => (
                              <div key={i} className="flex-shrink-0 text-center" style={{ width: "140px" }}>
                                <div className="relative aspect-square bg-warm-50 border border-warm-200 rounded overflow-hidden mb-2">
                                  {v.image ? (
                                    <Image src={v.image} alt={v.name || `Variante ${i + 1}`} fill className="object-contain p-2" sizes="140px" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-warm-300 text-xs">N/A</div>
                                  )}
                                </div>
                                {v.name && <p className="text-[11px] text-warm-700 font-light">{v.name}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-warm-400 font-light">Nessuna variante disponibile.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* --- DIMENSIONI --- */}
              <div>
                <button
                  onClick={() => setOpenAccordion(openAccordion === "dimensioni" ? null : "dimensioni")}
                  className="w-full flex items-center justify-between py-5 px-2 group"
                >
                  <span className="uppercase text-xs tracking-[0.15em] text-warm-900 transition-colors">
                    Dimensioni
                  </span>
                  <span className="w-8 h-8 border border-warm-900 flex items-center justify-center text-warm-900 flex-shrink-0">
                    {openAccordion === "dimensioni" ? <Minus size={14} /> : <Plus size={14} />}
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
                        <div className="flex flex-col items-center gap-8">
                          {/* Immagine dimensioni */}
                          {product.dimensionImage && (
                            <div className="relative bg-white p-6 w-full max-w-3xl" style={{ aspectRatio: "2 / 1" }}>
                              <Image src={product.dimensionImage} alt={`${product.name} dimensioni`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 60vw" />
                            </div>
                          )}

                          {/* Misure testo */}
                          {product.dimensions ? (
                            <div className="text-center">
                              {product.dimensions.split("\n").map((line, i) => (
                                <p key={i} className="text-sm text-warm-700 font-light leading-relaxed">
                                  {line || "\u00A0"}
                                </p>
                              ))}
                            </div>
                          ) : !product.dimensionImage && (
                            <p className="text-sm text-warm-400 font-light">Dimensioni non disponibili.</p>
                          )}
                        </div>
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
                  <span className="uppercase text-xs tracking-[0.15em] text-warm-900 transition-colors">
                    Documentazione
                  </span>
                  <span className="w-8 h-8 border border-warm-900 flex items-center justify-center text-warm-900 flex-shrink-0">
                    {openAccordion === "scheda" ? <Minus size={14} /> : <Plus size={14} />}
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
                      <div className="px-2 pb-8 space-y-3">
                        {(product.techSheetUrl || product.model2dUrl || product.model3dUrl) ? (
                          <div className="flex flex-wrap gap-4">
                            {product.techSheetUrl && (
                              <a href={product.techSheetUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-warm-300 text-sm text-warm-800 hover:bg-warm-100 transition-colors">
                                <ChevronRight size={14} /> Scheda Tecnica
                              </a>
                            )}
                            {product.model2dUrl && (
                              <a href={product.model2dUrl} download
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-warm-300 text-sm text-warm-800 hover:bg-warm-100 transition-colors">
                                <ChevronRight size={14} /> Modello 2D
                              </a>
                            )}
                            {product.model3dUrl && (
                              <a href={product.model3dUrl} download
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-warm-300 text-sm text-warm-800 hover:bg-warm-100 transition-colors">
                                <ChevronRight size={14} /> Modello 3D
                              </a>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-warm-500 font-light">
                              Per scaricare la documentazione tecnica, contattaci o visita l&apos;area professionisti.
                            </p>
                            <Link
                              href="/contatti/richiesta-info"
                              className="inline-flex items-center gap-2 uppercase text-xs tracking-[0.15em] text-warm-800 hover:text-accent transition-colors group mt-2"
                            >
                              Richiedi documentazione
                              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                            </Link>
                          </>
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

      {/* ===== 7. PROJECT REFERENCE — dynamic projects linked to this product ===== */}
      <section id="progetti" className="mt-16 lg:mt-24">
        {product.projects && product.projects.length > 0 && (
          <div className="w-full">
            {product.projects.length === 1 ? (
              /* Single project — full-width split layout */
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="relative"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  <Image
                    src={product.projects[0].imageUrl}
                    alt={product.projects[0].name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 lg:p-12">
                    {product.projects[0].country && (
                      <p className="uppercase text-[10px] tracking-[0.2em] text-white/70 mb-2">
                        {product.projects[0].country}
                      </p>
                    )}
                    <h3 className="font-sans text-lg md:text-xl lg:text-2xl text-white font-light uppercase tracking-wide leading-snug">
                      {product.projects[0].name}
                    </h3>
                    <Link
                      href={`/progetti/${product.projects[0].slug}`}
                      className="inline-flex items-center gap-2 uppercase text-[10px] tracking-[0.15em] text-white/80 hover:text-white transition-colors group mt-4"
                    >
                      Scopri di più
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col justify-center items-center text-center p-10 lg:p-16 bg-white"
                >
                  <p className="uppercase text-[11px] tracking-[0.25em] text-warm-400 mb-4">Progetti</p>
                  <h3 className="font-sans text-lg md:text-xl lg:text-2xl text-warm-900 font-light uppercase tracking-wide leading-snug">
                    Gli ambienti si vestono<br />di eleganza con {product.name}
                  </h3>
                  <Link
                    href="/progetti"
                    className="inline-flex items-center gap-2 uppercase text-xs tracking-[0.15em] text-warm-900 hover:text-accent transition-colors group mt-8"
                  >
                    Esplora le realizzazioni
                    <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </motion.div>
              </div>
            ) : (
              /* Multiple projects — grid */
              <div className="gtv-container py-16 lg:py-24">
                <div className="text-center mb-12">
                  <p className="uppercase text-[11px] tracking-[0.25em] text-warm-400 mb-4">Progetti</p>
                  <h3 className="font-sans text-lg md:text-xl lg:text-2xl text-warm-900 font-light uppercase tracking-wide leading-snug">
                    Gli ambienti si vestono di eleganza con {product.name}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {product.projects.map((proj, i) => (
                    <motion.div
                      key={proj.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    >
                      <Link href={`/progetti/${proj.slug}`} className="group block relative" style={{ aspectRatio: "4 / 3" }}>
                        <Image
                          src={proj.imageUrl}
                          alt={proj.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6 lg:p-8">
                          {proj.country && (
                            <p className="uppercase text-[10px] tracking-[0.2em] text-white/70 mb-1">{proj.country}</p>
                          )}
                          <h4 className="font-sans text-base md:text-lg text-white font-light uppercase tracking-wide">
                            {proj.name}
                          </h4>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 8. SUPPORTO AI PROFESSIONISTI — split text + image ===== */}
      <section className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left — text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center p-10 lg:p-16 xl:p-20 bg-white"
          >
            <p className="uppercase text-[11px] tracking-[0.25em] text-warm-400 mb-4">Supporto ai professionisti</p>
            <h3 className="font-sans text-lg md:text-xl lg:text-2xl text-warm-800 font-light uppercase tracking-wide leading-snug">
              Hai un progetto contract<br />da realizzare?
            </h3>
            <p className="text-warm-500 text-sm font-light leading-relaxed mt-4 max-w-md">
              Collabora con il nostro team per sviluppare progetti unici che soddisfino le esigenze del tuo cliente.
            </p>

            {/* 3 feature icons */}
            <div className="flex items-start gap-8 mt-10">
              <div className="flex flex-col items-center text-center max-w-[100px]">
                <svg className="w-7 h-7 text-warm-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <path d="M3 9h18M9 3v18" />
                  <path d="M7 13l2 2 4-4" />
                </svg>
                <p className="text-[9px] text-warm-500 uppercase tracking-wider leading-tight">Dimensioni personalizzate dei prodotti</p>
              </div>
              <div className="flex flex-col items-center text-center max-w-[100px]">
                <svg className="w-7 h-7 text-warm-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <rect x="2" y="6" width="8" height="12" rx="1" />
                  <rect x="14" y="6" width="8" height="12" rx="1" />
                  <path d="M6 10h0M6 14h0M18 10h0M18 14h0" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <p className="text-[9px] text-warm-500 uppercase tracking-wider leading-tight">Finiture differenti dallo standard</p>
              </div>
              <div className="flex flex-col items-center text-center max-w-[100px]">
                <svg className="w-7 h-7 text-warm-600 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <p className="text-[9px] text-warm-500 uppercase tracking-wider leading-tight">Realizzazione modelli non a catalogo</p>
              </div>
            </div>

            <Link
              href="/contatti/richiesta-info"
              className="inline-flex items-center gap-2 uppercase text-xs tracking-[0.15em] text-warm-800 hover:text-accent transition-colors group mt-10"
            >
              Contattaci per il tuo progetto
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>

          {/* Right — lifestyle image */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative img-hover"
            style={{ aspectRatio: "4 / 3" }}
          >
            <Image
              src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&q=80"
              alt="Supporto professionisti"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </section>

      {/* ===== 9. BREADCRUMBS ===== */}
      <div className="gtv-container py-8">
        <div className="flex items-center justify-start gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/prodotti" className="hover:text-warm-700 transition-colors">Prodotti</Link>
          <ChevronRight size={10} />
          <Link href={`/prodotti?category=${product.category}`} className="hover:text-warm-700 transition-colors">
            {product.category}
          </Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">{product.name}</span>
        </div>
      </div>
    </>
  );
}
