"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

      {/* ===== 2. DESCRIPTION — same style as product page ===== */}
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

          {/* Right — description, vertically centered like product page */}
          <div className="flex flex-col justify-center px-10 md:px-16 lg:px-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {project.description && (
                <div
                  className="text-[20px] text-black leading-snug font-light tracking-normal max-w-none overflow-hidden [&_p]:m-0"
                  style={{ textAlign: "justify" }}
                  dangerouslySetInnerHTML={{ __html: project.description.includes("<") ? project.description : `<p>${project.description}</p>` }}
                />
              )}

              {/* Info details */}
              <div className="flex items-center gap-8 mt-10">
                {project.architect && (
                  <div>
                    <p className="uppercase text-xs tracking-[0.08em] text-warm-900 font-light border-b border-warm-900 pb-1 inline-block">Foto da</p>
                    <p className="text-[20px] text-black font-light mt-2">{project.architect}</p>
                  </div>
                )}
                {(project.city || project.country) && (
                  <div>
                    <p className="uppercase text-xs tracking-[0.08em] text-warm-900 font-light border-b border-warm-900 pb-1 inline-block">Location</p>
                    <p className="text-[20px] text-black font-light mt-2">
                      {[project.city, project.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. GALLERY — horizontal scrollable carousel like product inspiration ===== */}
      {gallery.length > 0 && <GalleryCarousel images={gallery} projectName={project.name} />}

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
              <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light">Prodotti utilizzati nel progetto</p>
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
                        {product.subcategory || (product.category === "CLASSICI" ? "Classici" : product.category?.charAt(0) + product.category?.slice(1).toLowerCase())}
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

/* ─── Gallery Carousel — horizontal scroll like product InspirationCarousel ─── */
function GalleryCarousel({ images, projectName }: { images: string[]; projectName: string }) {
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
    <section className="pb-16 lg:pb-24">
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
                className="relative overflow-hidden"
                style={{ width: "calc(45vw - 14px)", minWidth: "340px", aspectRatio: "16 / 10" }}
              >
                <Image
                  src={url}
                  alt={`${projectName} ${i + 1}`}
                  fill
                  className="object-cover"
                  draggable={false}
                  sizes="50vw"
                />
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
