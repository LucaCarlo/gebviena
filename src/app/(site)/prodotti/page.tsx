"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT, useLang } from "@/contexts/I18nContext";
import type { Product, HeroSlide } from "@/types";

const ITEMS_PER_PAGE = 24;
const HERO_AUTOPLAY = 5000;

function ProductsHero() {
  const t = useT();
  const lang = useLang();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/hero-slides?page=products&lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        setSlides(data.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [lang]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  // Fallback: static hero if no slides configured
  if (loaded && slides.length === 0) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ height: "min(118vh, 1107px)" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-[58px] text-white tracking-normal"
          style={{ marginTop: "-12px" }}
        >
          {t("prodotti.title")}
        </motion.h1>
      </section>
    );
  }

  if (!loaded) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-100" style={{ height: "min(118vh, 1107px)" }}>
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </section>
    );
  }

  const slide = slides[current];

  const textAlignH =
    slide.position === "left" ? "items-start text-left pl-8 md:pl-20" :
    slide.position === "right" ? "items-end text-right pr-8 md:pr-20" :
    "items-center text-center";

  const textAlignV =
    slide.verticalPosition === "top" ? "top-20 bottom-auto" :
    slide.verticalPosition === "bottom" ? "bottom-20 top-auto" :
    "top-[46%] -translate-y-1/2";

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "min(118vh, 1107px)" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={slide.imageUrl}
            alt={slide.title}
            fill
            className="object-cover mix-blend-multiply"
            priority
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/60" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${slide.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH}`}
        >
          <h1 className="font-serif text-[58px] text-white tracking-normal" style={{ marginTop: "-12px" }}>
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-sm md:text-base text-white/70 mt-2 max-w-2xl">
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <Link
              href={slide.ctaLink}
              className="inline-block mt-4 uppercase text-[16px] tracking-[0.03em] text-white font-medium hover:text-white/80 hover:underline transition-colors"
            >
              {slide.ctaText} <span className="ml-1">&rarr;</span>
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide precedente"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide successivo"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === current
                  ? "w-6 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Vai allo slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface TypologyItem {
  value: string;
  label: string;
  id: string;
}

interface CategoryItem {
  value: string;
  label: string;
  id: string;
  typologies: { typology: { id: string; value: string } }[];
}

function ProductsContent() {
  const t = useT();
  const lang = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get("category") || "TUTTI";
  const currentSubcategory = searchParams.get("subcategory") || null;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typologies, setTypologies] = useState<TypologyItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const separatorRef = useRef<HTMLDivElement>(null);
  const typoButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [notchX, setNotchX] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate notch position when category changes
  useEffect(() => {
    const updateNotch = () => {
      const sep = separatorRef.current;
      const btn = typoButtonRefs.current[currentCategory];
      if (sep && btn) {
        const sRect = sep.getBoundingClientRect();
        const bRect = btn.getBoundingClientRect();
        setNotchX(bRect.left + bRect.width / 2 - sRect.left);
        setContainerWidth(sRect.width);
      }
    };
    // Small delay to ensure layout is ready
    const raf = requestAnimationFrame(updateNotch);
    window.addEventListener("resize", updateNotch);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateNotch);
    };
  }, [currentCategory, typologies]);

  // Load typologies and categories from DB
  useEffect(() => {
    Promise.all([
      fetch(`/api/typologies?contentType=products&lang=${lang}`).then((r) => r.json()),
      fetch(`/api/categories?contentType=products&lang=${lang}`).then((r) => r.json()),
    ]).then(([tData, cData]) => {
      setTypologies(tData.data || []);
      setAllCategories(cData.data || []);
    });
  }, [lang]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (currentSubcategory) params.set("subcategory", currentSubcategory);
    params.set("page", currentPage.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());
    params.set("lang", lang);

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentCategory, currentSubcategory, currentPage, lang]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== "TUTTI") params.set("category", cat);
    router.push(`/prodotti?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.py-8")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const setSubcategory = (sub: string | null) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (sub) params.set("subcategory", sub);
    router.push(`/prodotti?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.py-8")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    if (currentSubcategory) params.set("subcategory", currentSubcategory);
    params.set("page", page.toString());
    router.push(`/prodotti?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.py-8")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  /* Get categories for current typology */
  const filteredCategories = currentCategory === "TUTTI"
    ? allCategories
    : allCategories.filter((c) => c.typologies.some((t) => t.typology.value === currentCategory));

  /* Pagination with ellipsis */
  const getPaginationItems = () => {
    const items: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        items.push(i);
      }
      if (currentPage < totalPages - 2) items.push("...");
      items.push(totalPages);
    }
    return items;
  };

  return (
    <>
      {/* ===== DYNAMIC HERO ===== */}
      <ProductsHero />

      {/* ===== DESCRIPTION ===== */}
      <section className="gtv-container py-14 md:py-20">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[20px] text-black leading-snug max-w-[940px] font-light tracking-normal"
          style={{ marginLeft: "auto", marginRight: "auto" }}
        >
          {t("prodotti.description")}
        </motion.p>
      </section>

      {/* ===== FILTERS SECTION ===== */}
      <div className="gtv-container">
        {/* Tipologie — testo semplice con sottolineatura */}
        <div className="flex flex-wrap gap-6 md:gap-8 justify-center pb-6">
          <button
            ref={(el) => { typoButtonRefs.current["TUTTI"] = el; }}
            onClick={() => setCategory("TUTTI")}
            className={`text-[16px] font-light tracking-[0.01em] text-dark pb-1 transition-all border-b ${
              currentCategory === "TUTTI"
                ? "border-transparent"
                : "border-transparent hover:border-dark"
            }`}
          >
            {t("prodotti.filter.all")}
          </button>
          {typologies.map((typo) => (
            <button
              key={typo.value}
              ref={(el) => { typoButtonRefs.current[typo.value] = el; }}
              onClick={() => setCategory(typo.value)}
              className={`text-[16px] font-light tracking-[0.01em] text-dark pb-1 transition-all border-b ${
                currentCategory === typo.value
                  ? "border-transparent"
                  : "border-transparent hover:border-dark"
              }`}
            >
              {typo.label}
            </button>
          ))}
        </div>

        {/* Separator — single continuous line with ^ notch */}
        <div className="relative h-[14px] -mx-4 md:-mx-8 lg:-mx-12" ref={separatorRef}>
          {containerWidth > 0 && (
            <svg
              className="absolute bottom-0 left-0 w-full"
              height="14"
              style={{ overflow: "visible" }}
            >
              <path
                d={
                  notchX !== null
                    ? `M0 13.5 L${notchX - 10} 13.5 L${notchX} 2 L${notchX + 10} 13.5 L${containerWidth} 13.5`
                    : `M0 13.5 L${containerWidth} 13.5`
                }
                stroke="#000"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
          {containerWidth === 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-dark" />
          )}
        </div>

        {/* Categorie — pill con sfondo arrotondato */}
        {filteredCategories.length > 0 && (
          <div className="pt-10 pb-2">
            <div className="flex flex-wrap gap-x-5 gap-y-5 justify-center">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSubcategory(currentSubcategory === cat.value ? null : cat.value)}
                  className={`px-2.5 py-1 rounded-full text-[16px] font-light uppercase tracking-[0.01em] transition-all ${
                    currentSubcategory === cat.value
                      ? "bg-dark text-white"
                      : "bg-warm-100 text-dark hover:bg-warm-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <section className="py-8 md:py-10">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-warm-100" style={{ aspectRatio: "4/5" }} />
                <div className="h-2 bg-warm-100 mt-4 w-16" />
                <div className="h-3 bg-warm-100 mt-2 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              >
                <Link href={`/prodotti/${product.slug}`} className="group block">
                  <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5", isolation: "isolate" }}>
                    <Image
                      src={product.coverImage || product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain mix-blend-multiply p-4"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                      {product.subcategory || (() => { const t = (product.category || "").split(",")[0]; return t === "CLASSICI" ? "Classici" : t?.charAt(0) + t?.slice(1).toLowerCase(); })()}
                    </p>
                    <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                      {product.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-warm-400 text-sm">{t("prodotti.empty")}</p>
          </div>
        )}

        {/* ===== PAGINATION ===== */}
        {totalPages >= 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-16">
            {getPaginationItems().map((item, i) =>
              item === "..." ? (
                <span key={`ellipsis-${i}`} className="text-sm text-warm-400 px-1">&hellip;</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-8 h-8 rounded-full text-sm transition-colors ${
                    currentPage === item
                      ? "bg-warm-100 text-dark border border-dark"
                      : "bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        )}
      </section>

      {/* ===== BREADCRUMBS ===== */}
      <div className="gtv-container pb-2 -mt-10">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">{t("common.breadcrumb_home")}</Link>
          <ChevronRight size={12} />
          <span>{t("prodotti.breadcrumb")}</span>
        </div>
      </div>
    </>
  );
}

export default function ProdottiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
