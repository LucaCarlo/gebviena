"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Project, Product, Designer } from "@/types";

interface ProjectDetail extends Omit<Project, "products"> {
  products: { product: Product & { designer?: Designer } }[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/projects/slug?slug=${slug}`);
      const json = await res.json();
      if (json.success) setProject(json.data);
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

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-warm-500">Progetto non trovato</p>
        <Link href="/progetti" className="gtv-link">Torna ai progetti</Link>
      </div>
    );
  }

  const gallery: string[] = (() => {
    try {
      if (project.galleryUrls) return JSON.parse(project.galleryUrls);
    } catch { /* ignore */ }
    return [];
  })();

  const products = project.products?.map((pp) => pp.product).filter(Boolean) || [];
  const heroImg = project.heroImage || project.coverImage || project.imageUrl;
  const sideImg = project.sideImage || project.coverImage || project.imageUrl;

  return (
    <>
      {/* ===== 1. HERO — full-screen image, title centered ===== */}
      <section className="relative w-full" style={{ height: "115vh" }}>
        <Image
          src={heroImg}
          alt={project.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white tracking-wide">
            {project.name}
          </h1>
        </motion.div>
      </section>

      {/* ===== 2. DESCRIPTION — image left, info right ===== */}
      <section className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left — project image */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
            style={{ aspectRatio: "3 / 4.2" }}
          >
            <Image
              src={sideImg}
              alt={`${project.name} detail`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          {/* Right — 3 info columns, aligned to top */}
          <div className="flex flex-col justify-start pt-12 lg:pt-20 px-10 md:px-16 lg:px-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="grid grid-cols-3 gap-10">
                {/* Progetto */}
                <div>
                  <p className="uppercase text-xs md:text-sm tracking-[0.2em] font-semibold mb-4" style={{ color: "#000000" }}>
                    Progetto
                  </p>
                  {project.description && (
                    project.description.includes("<") ? (
                      <div
                        className="leading-relaxed text-sm md:text-base font-light prose prose-warm max-w-none"
                        style={{ color: "#000000" }}
                        dangerouslySetInnerHTML={{ __html: project.description }}
                      />
                    ) : (
                      <p className="leading-relaxed text-sm md:text-base font-light" style={{ color: "#000000" }}>
                        {project.description}
                      </p>
                    )
                  )}
                </div>

                {/* Foto da (Architetto) */}
                <div>
                  <p className="uppercase text-xs md:text-sm tracking-[0.2em] font-semibold mb-4" style={{ color: "#000000" }}>
                    Foto da
                  </p>
                  {project.architect ? (
                    <p className="text-sm md:text-base font-light" style={{ color: "#000000" }}>{project.architect}</p>
                  ) : (
                    <p className="text-sm md:text-base font-light" style={{ color: "#999" }}>—</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <p className="uppercase text-xs md:text-sm tracking-[0.2em] font-semibold mb-4" style={{ color: "#000000" }}>
                    Location
                  </p>
                  <p className="text-sm md:text-base font-light" style={{ color: "#000000" }}>
                    {[project.city, project.country].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. GALLERY SLIDESHOW — click to advance ===== */}
      {gallery.length > 0 && <GallerySlideshow images={gallery} projectName={project.name} />}

      {/* ===== 4. PRODUCTS USED IN THIS PROJECT ===== */}
      {products.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="gtv-container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="font-sans text-sm md:text-base text-warm-900 uppercase tracking-[0.2em]">
                Prodotti utilizzati nel progetto
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <Link href={`/prodotti/${product.slug}`} className="group block">
                    <div className="relative bg-warm-50 mb-3" style={{ aspectRatio: "3 / 4" }}>
                      <Image
                        src={product.coverImage || product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    </div>
                    <p className="uppercase text-[10px] tracking-[0.15em] text-warm-400">
                      {product.category}
                    </p>
                    <p className="text-sm text-warm-900 font-light uppercase tracking-wide mt-0.5">
                      {product.name}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 5. BREADCRUMBS ===== */}
      <div className="gtv-container py-8">
        <div className="flex items-center justify-start gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/progetti" className="hover:text-warm-700 transition-colors">Progetti</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">{project.name}</span>
        </div>
      </div>
    </>
  );
}

/* ─── Gallery Slideshow — click to advance ─── */
function GallerySlideshow({ images, projectName }: { images: string[]; projectName: string }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = () => setCurrent((prev) => (prev + 1) % images.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

  return (
    <section className="py-16 lg:py-24">
      <div className="gtv-container">
        {/* Main image */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden cursor-pointer"
          style={{ aspectRatio: "16 / 9" }}
          onClick={goNext}
        >
          {images.map((url, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{
                opacity: i === current ? 1 : 0,
                scale: i === current ? 1 : 1.02,
              }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute inset-0"
              style={{ pointerEvents: i === current ? "auto" : "none" }}
            >
              <Image
                src={url}
                alt={`${projectName} ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </motion.div>
          ))}

          {/* Navigation arrows */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft size={18} className="text-warm-800" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight size={18} className="text-warm-800" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="relative h-[1px] bg-warm-200 w-full max-w-3xl mx-auto mt-8">
          <div
            className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-500 ease-out"
            style={{ width: `${100 / images.length}%`, transform: `translateX(${current * 100}%)` }}
          />
        </div>

        {/* Counter */}
        <div className="text-center mt-4">
          <span className="text-[11px] text-warm-400 tracking-wider">
            {current + 1} / {images.length}
          </span>
        </div>
      </div>
    </section>
  );
}
