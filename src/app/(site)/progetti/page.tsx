"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Project, HeroSlide } from "@/types";

const HERO_AUTOPLAY = 5000;

function ProjectsHero() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/hero-slides?page=projects")
      .then((r) => r.json())
      .then((data) => {
        setSlides(data.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  // Fallback: original static hero
  if (loaded && slides.length === 0) {
    return (
      <section className="relative h-[calc(100vh-6rem)] flex items-center justify-center bg-warm-900">
        <Image
          src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=600&fit=crop"
          alt="Progetti"
          fill
          className="object-cover opacity-30"
        />
        <h1 className="relative font-serif text-4xl md:text-5xl text-white">Progetti</h1>
      </section>
    );
  }

  if (!loaded) {
    return (
      <section className="relative h-[calc(100vh-6rem)] flex items-center justify-center bg-warm-900">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </section>
    );
  }

  const slide = slides[current];

  const textAlignH =
    slide.position === "left" ? "items-start text-left pl-8 md:pl-20" :
    slide.position === "right" ? "items-end text-right pr-8 md:pr-20" :
    "items-center text-center";

  const justifyV =
    slide.verticalPosition === "top" ? "justify-start pt-12" :
    slide.verticalPosition === "bottom" ? "justify-end pb-12" :
    "justify-center";

  return (
    <section className="relative h-[calc(100vh-6rem)] overflow-hidden">
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
        <div className="absolute inset-0 bg-black/40" />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${slide.id}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`absolute inset-0 flex flex-col ${justifyV} ${textAlignH}`}
        >
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-sm md:text-base text-white/70 mt-2 max-w-xl">
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <Link
              href={slide.ctaLink}
              className="inline-block mt-3 uppercase text-xs tracking-[0.2em] text-white font-medium hover:text-white/80 transition-colors"
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
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide precedente"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide successivo"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === current
                  ? "w-5 h-1.5 bg-white"
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
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentType = searchParams.get("type") || "TUTTI";
  const currentPage = parseInt(searchParams.get("page") || "1");

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [projectCategories, setProjectCategories] = useState<CategoryItem[]>([]);

  // Load categories from DB
  useEffect(() => {
    fetch("/api/categories?contentType=projects")
      .then((r) => r.json())
      .then((data) => setProjectCategories(data.data || []));
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentType !== "TUTTI") params.set("type", currentType);
    if (selectedCountry) params.set("country", selectedCountry);
    params.set("page", currentPage.toString());
    params.set("limit", "16");

    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentType, currentPage, selectedCountry]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch all countries for filter
  useEffect(() => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((data) => {
        const allCountries = Array.from(new Set((data.data || []).map((p: Project) => p.country))).sort();
        setCountries(allCountries as string[]);
      });
  }, []);

  const setType = (type: string) => {
    const params = new URLSearchParams();
    if (type !== "TUTTI") params.set("type", type);
    router.push(`/progetti?${params}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentType !== "TUTTI") params.set("type", currentType);
    params.set("page", page.toString());
    router.push(`/progetti?${params}`);
  };

  // Build type labels from DB categories
  const typeLabels: Record<string, string> = {};
  projectCategories.forEach((c) => { typeLabels[c.value] = c.label.toUpperCase(); });

  return (
    <>
      {/* Dynamic Hero */}
      <ProjectsHero />

      {/* Description */}
      <section className="luxury-container py-12 text-center">
        <p className="text-sm text-warm-600 leading-relaxed max-w-3xl mx-auto">
          Uno sguardo sulle nostre realizzazioni nel mondo. Dai bistrot più ricercati agli hotel
          d&apos;avanguardia, dagli spazi culturali ai contesti residenziali, i nostri arredi contribuiscono a
          definire atmosfere inconfondibili. In questa sezione raccogliamo una selezione di progetti
          che raccontano come la nostra estetica e la nostra storia si intrecciano con le visioni di
          architetti e interior designer contemporanei.
        </p>
      </section>

      {/* Type tabs */}
      <section className="luxury-container pb-4">
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => setType("TUTTI")}
            className={`text-xs font-medium uppercase tracking-[0.15em] pb-2 transition-colors ${
              currentType === "TUTTI"
                ? "text-warm-800 border-b-2 border-warm-800"
                : "text-warm-400 hover:text-warm-600"
            }`}
          >
            Tutti
          </button>
          {projectCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setType(cat.value)}
              className={`text-xs font-medium uppercase tracking-[0.15em] pb-2 transition-colors ${
                currentType === cat.value
                  ? "text-warm-800 border-b-2 border-warm-800"
                  : "text-warm-400 hover:text-warm-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dropdown filters */}
      <section className="luxury-container pb-8">
        <div className="flex flex-wrap gap-4 justify-center">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="border border-warm-300 rounded px-4 py-2 text-xs text-warm-600 focus:outline-none focus:border-warm-800"
          >
            <option value="">Filtra per Paese</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Project Grid */}
      <section className="luxury-container pb-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-warm-200 rounded" />
                <div className="h-3 bg-warm-200 rounded mt-3 w-20" />
                <div className="h-4 bg-warm-200 rounded mt-2 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/progetti?type=${project.type}`}
                  className="group"
                >
                  <div className="image-hover aspect-square relative bg-warm-100 rounded-sm">
                    <Image
                      src={project.imageUrl}
                      alt={project.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-warm-400">
                      {typeLabels[project.type] || project.type}
                    </p>
                    <h3 className="text-sm font-medium text-warm-800 mt-0.5 group-hover:text-brand-500 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-full text-xs transition-colors ${
                      currentPage === i + 1
                        ? "bg-warm-800 text-white"
                        : "text-warm-500 hover:bg-warm-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {projects.length === 0 && !loading && (
              <div className="text-center py-12 text-warm-400">Nessun progetto trovato</div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default function ProgettiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-warm-400">Caricamento...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}
