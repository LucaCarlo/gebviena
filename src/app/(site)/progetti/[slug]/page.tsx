"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
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
      {/* ===== 1. HERO — same style as product page ===== */}
      <section className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
        <Image
          src={heroImg}
          alt={project.name}
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
            {project.name}
          </h1>
          {project.type && (
            <p className="uppercase text-[20px] tracking-[0.08em] text-white mt-2 font-light">
              {project.type}
            </p>
          )}
        </motion.div>
      </section>

      {/* ===== 2. DESCRIPTION — 3-column info layout, product-matching fonts ===== */}
      <section className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          {/* Left — project image */}
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
              alt={`${project.name} detail`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          {/* Right — 3 info columns like original, with product-matching fonts */}
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
                  <p className="uppercase text-[16px] tracking-[0.03em] text-black font-bold mb-4">
                    Progetto
                  </p>
                  {project.description && (
                    project.description.includes("<") ? (
                      <div
                        className="leading-snug text-[20px] font-light max-w-none text-black [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: project.description }}
                      />
                    ) : (
                      <p className="leading-snug text-[20px] font-light text-black">
                        {project.description}
                      </p>
                    )
                  )}
                </div>

                {/* Foto da (Architetto) */}
                <div>
                  <p className="uppercase text-[16px] tracking-[0.03em] text-black font-bold mb-4">
                    Foto da
                  </p>
                  {project.architect ? (
                    <p className="text-[20px] font-light text-black">{project.architect}</p>
                  ) : (
                    <p className="text-[20px] font-light text-black/40">—</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <p className="uppercase text-[16px] tracking-[0.03em] text-black font-bold mb-4">
                    Location
                  </p>
                  <p className="text-[20px] font-light text-black">
                    {[project.city, project.country].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* White space separator */}
      <div className="h-16 lg:h-24 bg-white" />

      {/* ===== 3. GALLERY — full-width slideshow with arrow navigation ===== */}
      {gallery.length > 0 && <GallerySlideshow images={gallery} projectName={project.name} />}

      {/* ===== 4. PRODUCTS USED — same card style as product listing page ===== */}
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
              <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                Prodotti utilizzati nel progetto
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-4 md:gap-y-12 px-2 md:px-3 lg:px-4">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
                >
                  <Link href={`/prodotti/${product.slug}`} className="group block">
                    <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5" }}>
                      <Image
                        src={product.coverImage || product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover mix-blend-multiply"
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
          </div>
        </section>
      )}

      {/* ===== 5. BREADCRUMBS — same style as product page ===== */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/progetti">Progetti</Link>
          <span>&gt;</span>
          <span>{project.name}</span>
        </div>
      </div>
    </>
  );
}

/* ─── Gallery Slideshow — one image at a time, arrow cursors on hover ─── */
function GallerySlideshow({ images, projectName }: { images: string[]; projectName: string }) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);

  const goNext = () => setCurrent((prev) => (prev + 1) % images.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverSide(x < rect.width / 2 ? "left" : "right");
  };

  const handleClick = () => {
    if (hoverSide === "left") goPrev();
    else goNext();
  };

  const cursorStyle = hoverSide === "left"
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M15 18l-6-6 6-6'/%3E%3C/svg%3E\") 20 20, pointer"
    : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M9 18l6-6-6-6'/%3E%3C/svg%3E\") 20 20, pointer";

  return (
    <section className="pb-16 lg:pb-24">
      <div className="w-full">
        {/* Main image */}
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{ height: "768px", cursor: cursorStyle }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverSide(null)}
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
        </div>

        {/* Progress bar */}
        <div className="gtv-container mt-8">
          <div className="relative h-[1px] bg-warm-200 w-full max-w-3xl mx-auto">
            <div
              className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-500 ease-out"
              style={{ width: `${100 / images.length}%`, transform: `translateX(${current * 100}%)` }}
            />
          </div>
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
