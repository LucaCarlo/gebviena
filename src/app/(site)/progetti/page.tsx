"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Project, HeroSlide } from "@/types";

const ITEMS_PER_PAGE = 24;
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

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, HERO_AUTOPLAY);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  if (loaded && slides.length === 0) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ height: "calc(100vh - 7.5rem + 2px)" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-[58px] text-white tracking-normal"
          style={{ marginTop: "-12px" }}
        >
          Progetti
        </motion.h1>
      </section>
    );
  }

  if (!loaded) {
    return (
      <section className="relative w-full flex items-center justify-center bg-warm-900" style={{ height: "calc(100vh - 7.5rem + 2px)" }}>
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
    <section className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 7.5rem + 2px)" }}>
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

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

function FilterDropdown({ label, options, value, onChange }: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-3 px-4 py-3 border border-black text-[16px] font-light text-black tracking-normal min-w-[220px] bg-white"
      >
        <span>{selectedLabel || label}</span>
        <ChevronDown size={26} strokeWidth={1} className={`transition-transform duration-300 ${open ? "-rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-black border-t-0 z-30 max-h-[280px] overflow-hidden flex flex-col">
          <div className="px-1 py-0.5 bg-warm-50">
            <input
              type="text"
              placeholder="Cerca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-[14px] font-light text-warm-500 placeholder:text-warm-400 tracking-normal px-1 py-0 bg-warm-50 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            <button
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className="w-full text-left px-2 py-0.5 text-[16px] font-light tracking-normal text-black"
            >
              {label}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                className="w-full text-left px-2 py-0.5 text-[16px] font-light tracking-normal text-black"
              >
                {o.label} ({o.count})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [countryOptions, setCountryOptions] = useState<FilterOption[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [productOptions, setProductOptions] = useState<FilterOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [projectCategories, setProjectCategories] = useState<CategoryItem[]>([]);
  const separatorRef = useRef<HTMLDivElement>(null);
  const typeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [notchX, setNotchX] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate notch position when type changes
  useEffect(() => {
    const updateNotch = () => {
      const sep = separatorRef.current;
      const btn = typeButtonRefs.current[currentType];
      if (sep && btn) {
        const sRect = sep.getBoundingClientRect();
        const bRect = btn.getBoundingClientRect();
        setNotchX(bRect.left + bRect.width / 2 - sRect.left);
        setContainerWidth(sRect.width);
      }
    };
    const raf = requestAnimationFrame(updateNotch);
    window.addEventListener("resize", updateNotch);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateNotch);
    };
  }, [currentType, projectCategories]);

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
    if (selectedProduct) params.set("productId", selectedProduct);
    params.set("page", currentPage.toString());
    params.set("limit", ITEMS_PER_PAGE.toString());

    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.data || []);
    setTotalPages(data.meta?.totalPages || 1);
    setLoading(false);
  }, [currentType, currentPage, selectedCountry, selectedProduct]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetch("/api/projects?limit=500")
      .then((r) => r.json())
      .then((data) => {
        const projects = data.data || [];
        // Count per country
        const countryCounts: Record<string, number> = {};
        projects.forEach((p: Project) => {
          countryCounts[p.country] = (countryCounts[p.country] || 0) + 1;
        });
        setCountryOptions(
          Object.entries(countryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([country, count]) => ({ value: country, label: country, count }))
        );
      });
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((data) => {
        setProductOptions(
          (data.data || []).map((p: { id: string; name: string }) => ({ value: p.id, label: p.name, count: 0 }))
        );
      });
  }, []);

  const setType = (type: string) => {
    const params = new URLSearchParams();
    if (type !== "TUTTI") params.set("type", type);
    router.push(`/progetti?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.pt-2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (currentType !== "TUTTI") params.set("type", currentType);
    if (selectedCountry) params.set("country", selectedCountry);
    params.set("page", page.toString());
    router.push(`/progetti?${params}`, { scroll: false });
    setTimeout(() => document.querySelector("section.pt-2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const typeLabels: Record<string, string> = {};
  projectCategories.forEach((c) => { typeLabels[c.value] = c.label; });

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
      <ProjectsHero />

      {/* ===== DESCRIPTION ===== */}
      <section className="gtv-container py-10 md:py-14">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[20px] text-black leading-snug max-w-[940px] mx-auto font-light tracking-normal"
        >
          Uno sguardo sulle nostre realizzazioni nel mondo.<br />
          Dai bistrot più ricercati agli hotel d&apos;avanguardia, dagli spazi culturali ai contesti residenziali, i nostri arredi contribuiscono a definire atmosfere inconfondibili.<br />
          In questa sezione raccogliamo una selezione di progetti che raccontano come la nostra estetica e la nostra storia si intrecciano con le visioni di architetti e interior designer contemporanei.
        </motion.p>
      </section>

      {/* ===== FILTERS SECTION ===== */}
      <div className="gtv-container">
        <div className="flex flex-wrap gap-6 md:gap-8 justify-center pb-6">
          <button
            ref={(el) => { typeButtonRefs.current["TUTTI"] = el; }}
            onClick={() => setType("TUTTI")}
            className={`text-[16px] font-light tracking-[0.01em] text-dark pb-1 transition-all border-b ${
              currentType === "TUTTI"
                ? "border-transparent"
                : "border-transparent hover:border-dark"
            }`}
          >
            Tutti
          </button>
          {projectCategories.map((cat) => (
            <button
              key={cat.value}
              ref={(el) => { typeButtonRefs.current[cat.value] = el; }}
              onClick={() => setType(cat.value)}
              className={`text-[16px] font-light tracking-[0.01em] text-dark pb-1 transition-all border-b ${
                currentType === cat.value
                  ? "border-transparent"
                  : "border-transparent hover:border-dark"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Separator with notch */}
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

        {/* Dropdown filters */}
        <div className="flex justify-center gap-3 md:gap-4 pt-16 pb-2">
          <FilterDropdown
            label="Filtra per Paese"
            options={countryOptions}
            value={selectedCountry}
            onChange={setSelectedCountry}
          />
          <FilterDropdown
            label="Filtra per prodotto"
            options={productOptions}
            value={selectedProduct}
            onChange={setSelectedProduct}
          />
        </div>
      </div>

      {/* ===== PROJECT GRID ===== */}
      <section className="pt-2 pb-8 md:pt-3 md:pb-10 px-2 md:px-3 lg:px-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-warm-100" style={{ aspectRatio: "4/5" }} />
                <div className="h-2 bg-warm-100 mt-4 w-16" />
                <div className="h-3 bg-warm-100 mt-2 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-12">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
              >
                <Link href={`/progetti/${project.slug}`} className="group block">
                  <div className="relative bg-warm-50 overflow-hidden" style={{ aspectRatio: "4/5" }}>
                    <Image
                      src={project.imageUrl}
                      alt={project.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="uppercase text-[16px] tracking-[0.01em] text-black font-light">
                      {typeLabels[project.type] || project.type}
                    </p>
                    <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                      {project.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <p className="text-warm-400 text-sm">Nessun progetto trovato per questa selezione.</p>
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
          <Link href="/">Home</Link>
          <ChevronRight size={12} />
          <span>Progetti</span>
        </div>
      </div>
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
