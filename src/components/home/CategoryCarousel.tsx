"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const categories = [
  {
    name: "Novità 2025",
    image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=NOVITA",
  },
  {
    name: "Sedute",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=SEDUTE",
  },
  {
    name: "Imbottiti",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=IMBOTTITI",
  },
  {
    name: "Complementi",
    image: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=COMPLEMENTI",
  },
  {
    name: "Tavoli",
    image: "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=TAVOLI",
  },
  {
    name: "Outdoor",
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&h=700&fit=crop&q=80",
    href: "/prodotti?category=OUTDOOR",
  },
];

export default function CategoryCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
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
    el.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <section className="py-20 md:py-28 lg:py-36 bg-white">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
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
          className={`flex gap-6 md:gap-10 lg:gap-14 overflow-x-auto px-6 md:px-12 lg:px-20 pb-2 ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <Link
                href={cat.href}
                className="group block"
                draggable={false}
                onClick={(e) => isDragging && e.preventDefault()}
              >
                {/* Product image — white background, no overlay */}
                <div className="relative w-52 h-72 md:w-60 md:h-80 lg:w-72 lg:h-96 bg-white">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-contain transition-transform duration-700 group-hover:scale-105"
                    draggable={false}
                  />
                </div>
                {/* Category name below — black, centered */}
                <p className="text-dark text-xs md:text-sm uppercase tracking-[0.2em] font-light text-center mt-6">
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

      {/* CTA button — outlined/bordered like original */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center mt-12 md:mt-16"
      >
        <Link
          href="/prodotti"
          className="inline-block uppercase text-sm md:text-base tracking-[0.15em] font-light text-white bg-black border border-black px-10 py-4 hover:bg-white hover:text-black transition-all duration-300"
        >
          Scopri l&apos;intera collezione
        </Link>
      </motion.div>
    </section>
  );
}
