"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/types";

const AUTOPLAY_INTERVAL = 6000;

const FALLBACK_SLIDE: HeroSlide = {
  id: "fallback",
  title: "Un omaggio alla tradizione viennese",
  subtitle: "",
  ctaText: "Kipferl by Antenna",
  ctaLink: "/prodotti",
  imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=2560&h=1707&fit=crop&q=90",
  coverImage: null,
  videoUrl: null,
  position: "center",
  verticalPosition: "bottom",
  imagePosition: "center center",
  textColor: "white",
  darkOverlay: false,
  overlayOpacity: 60,
  page: "homepage",
  isActive: true,
  sortOrder: 0,
  createdAt: "",
  updatedAt: "",
};

export default function HeroSection() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hero-slides?page=homepage")
      .then((r) => r.json())
      .then((data) => {
        const fetched = data.data || [];
        setSlides(fetched.length > 0 ? fetched : [FALLBACK_SLIDE]);
        setLoading(false);
      })
      .catch(() => {
        setSlides([FALLBACK_SLIDE]);
        setLoading(false);
      });
  }, []);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length, current]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  if (loading) {
    return (
      <section className="relative w-full bg-warm-100" style={{ height: "min(118vh, 1107px)" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  const slide = slides[current];

  const textAlignH =
    slide.position === "left" ? "items-start text-left pl-8 md:pl-20" :
    slide.position === "right" ? "items-end text-right pr-8 md:pr-20" :
    "items-center text-center";

  const textAlignV = "bottom-[12.5vh]";

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
            className="object-cover"
            priority={current === 0}
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>



      {/* Slight baseline darkening for legibility */}
      <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: 0.18 }} />
      {slide.darkOverlay && (
        <div className="absolute inset-0 bg-black" style={{ opacity: (slide.overlayOpacity ?? 60) / 100 }} />
      )}

      {/* Text content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${slide.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 1, delay: 0.3 }}
          className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH}`}
        >
          <h1 className={`font-sans text-2xl md:text-3xl lg:text-[38px] ${slide.textColor === "black" ? "text-black" : "text-white"} leading-snug font-light uppercase tracking-[inherit] whitespace-nowrap`} style={{ marginTop: "-5px" }}>
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className={`text-[16px] ${slide.textColor === "black" ? "text-black/60" : "text-white/60"} mt-2 max-w-2xl`}>
              {slide.subtitle}
            </p>
          )}
          {slide.ctaText && slide.ctaLink && (
            <Link
              href={slide.ctaLink}
              className={`inline-block mt-4 uppercase text-[16px] tracking-[0.03em] ${slide.textColor === "black" ? "text-black hover:text-black/70" : "text-white hover:text-white/80"} font-medium transition-colors duration-300 hover:underline`}
              style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
            >
              {slide.ctaText} &rarr;
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide precedente"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm text-white/70 flex items-center justify-center hover:bg-black/40 hover:text-white transition-all z-10"
            aria-label="Slide successivo"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
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
