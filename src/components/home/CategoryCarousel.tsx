"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface Category {
  name: string;
  image: string;
  href: string;
}

export default function CategoryCarousel() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/typologies?contentType=products")
      .then((r) => r.json())
      .then((res) => {
        const typos = (res.data || [])
          .filter((t: { isActive: boolean; imageUrl?: string }) => t.isActive && t.imageUrl)
          .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);

        setCategories(
          typos.map((t: { label: string; value: string; imageUrl: string }) => ({
            name: t.label,
            image: t.imageUrl,
            href: `/prodotti?category=${t.value}`,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const updateProgress = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(el.scrollLeft / maxScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => el.removeEventListener("scroll", updateProgress);
  }, [updateProgress]);

  /* Drag-to-scroll */
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(x - startX) > 5) setHasDragged(true);
    el.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <section className="py-20 md:py-28 lg:py-36 bg-white">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 md:mb-24 px-4"
      >
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-dark font-normal">
          Heritage <em>designs</em> the future
        </h2>
      </motion.div>

      {/* Scrollable product carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex gap-6 md:gap-10 lg:gap-14 overflow-x-auto px-6 md:px-12 lg:px-20 pb-2 min-h-[296px] md:min-h-[320px] lg:min-h-[368px] ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <Link
                href={cat.href}
                className="group block"
                draggable={false}
                onClick={(e) => hasDragged && e.preventDefault()}
              >
                {/* Product image — white background, no overlay */}
                <div className="relative w-52 h-52 md:w-60 md:h-60 lg:w-72 lg:h-72 bg-white">
                  {cat.image && (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      draggable={false}
                    />
                  )}
                </div>
                {/* Category name below */}
                <p className="!text-black text-[16px] uppercase tracking-[0.03em] font-normal text-center mt-6">
                  {cat.name}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className="gtv-container mt-10 md:mt-14">
        <div className="relative h-[2px] bg-grey-mid/30 w-full max-w-3xl mx-auto">
          <div
            className="absolute top-0 left-0 h-full bg-dark transition-all duration-150 ease-out"
            style={{
              width: "33%",
              transform: `translateX(${scrollProgress * 200}%)`,
            }}
          />
        </div>
      </div>

      {/* CTA button */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center mt-12 md:mt-16"
      >
        <Link
          href="/prodotti"
          className="inline-block uppercase text-[16px] tracking-[0.03em] font-normal text-black bg-white border border-black px-7 py-2"
        >
          Scopri l&apos;intera collezione
        </Link>
      </motion.div>
    </section>
  );
}
