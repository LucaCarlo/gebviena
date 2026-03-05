"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Campaign, HeroSlide } from "@/types";

const ITEMS_PER_PAGE = 16;
const HERO_AUTOPLAY = 5000;

function CampaignsHero() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/hero-slides?page=campagne-video")
      .then((r) => r.json())
      .then((data) => {
        setSlides(data.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  if (loaded && slides.length === 0) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ height: "calc(100vh - 6rem)" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-[46px] md:text-[58px] lg:text-[70px] text-white tracking-wide"
        >
          Campagne &amp; Video
        </motion.h1>
      </section>
    );
  }

  if (!loaded) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-100" style={{ height: "calc(100vh - 6rem)" }}>
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
    "top-1/2 -translate-y-1/2";

  return (
    <section className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 6rem)" }}>
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
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      {slide.darkOverlay ? (
        <div className="absolute inset-0 bg-black" style={{ opacity: (slide.overlayOpacity ?? 60) / 100 }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${slide.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH}`}
        >
          <h1 className="font-serif text-[40px] md:text-[50px] lg:text-[60px] text-white tracking-wide">
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
              className="inline-block mt-4 uppercase text-sm tracking-[0.2em] text-white font-medium hover:text-white/80 transition-colors"
            >
              {slide.ctaText} <span className="ml-1">&rarr;</span>
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

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

interface CategoryItem {
  value: string;
  label: string;
  id: string;
}

function CampaignsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get("category") || "TUTTI";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    fetch("/api/categories?contentType=campaigns")
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []));
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    params.set("page", currentPage.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());

    const res = await fetch(`/api/campaigns?${params}`);
    const data = await res.json();
    setCampaigns(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentCategory, currentPage]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== "TUTTI") params.set("category", cat);
    router.push(`/campagne-e-video?${params}`, { scroll: false });
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentCategory !== "TUTTI") params.set("category", currentCategory);
    params.set("page", page.toString());
    router.push(`/campagne-e-video?${params}`, { scroll: false });
  };

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
      <CampaignsHero />

      {/* ===== DESCRIPTION ===== */}
      <section className="gtv-container py-14 md:py-20">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-base md:text-lg text-black leading-relaxed max-w-4xl mx-auto text-center font-light"
          style={{ textAlign: "justify" }}
        >
          Le campagne e i video di Gebrüder Thonet Vienna raccontano il mondo GTV attraverso immagini
          e narrazioni che celebrano il design, la tradizione e l&apos;innovazione. Scopri le nostre
          ultime produzioni visive e lasciati ispirare.
        </motion.p>
      </section>

      {/* ===== CATEGORIES FILTER ===== */}
      <div className="gtv-container">
        {categories.length > 0 && (
          <div className="pb-2">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setCategory("TUTTI")}
                className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.1em] transition-all ${
                  currentCategory === "TUTTI"
                    ? "bg-dark text-white"
                    : "bg-warm-100 text-dark hover:bg-warm-200"
                }`}
              >
                Tutti
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(currentCategory === cat.value ? "TUTTI" : cat.value)}
                  className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-[0.1em] transition-all ${
                    currentCategory === cat.value
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

      {/* ===== CAMPAIGNS GRID ===== */}
      <section className="gtv-container py-12 md:py-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-warm-100" />
                <div className="h-2 bg-warm-100 mt-4 w-16" />
                <div className="h-3 bg-warm-100 mt-2 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14">
            {campaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              >
                <Link href={`/campagne-e-video/${campaign.slug}`} className="group block">
                  <div className="relative aspect-square bg-warm-50 overflow-hidden">
                    <Image
                      src={campaign.imageUrl}
                      alt={campaign.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-4">
                    {campaign.type && (
                      <p className="text-xs uppercase tracking-[0.15em] text-black font-normal">
                        {campaign.type}
                      </p>
                    )}
                    <h3 className="text-base md:text-lg font-normal uppercase tracking-[0.08em] text-black mt-1 group-hover:text-warm-500 transition-colors">
                      {campaign.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <div className="text-center py-20">
            <p className="text-warm-400 text-sm">Nessuna campagna trovata per questa selezione.</p>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-16">
            {getPaginationItems().map((item, i) =>
              item === "..." ? (
                <span key={`ellipsis-${i}`} className="text-xs text-warm-400 px-1">&hellip;</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-9 h-9 rounded-full text-xs transition-colors border ${
                    currentPage === item
                      ? "border-warm-800 text-warm-800"
                      : "border-transparent text-warm-400 hover:text-warm-700"
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
      <div className="gtv-container pb-12">
        <div className="flex items-center justify-start gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Campagne &amp; Video</span>
        </div>
      </div>
    </>
  );
}

export default function CampagneVideoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
