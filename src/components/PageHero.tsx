"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { HeroSlide } from "@/types";

interface PageHeroProps {
  page: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  defaultImage: string;
  /** Height style, e.g. "110vh", "calc(100vh - 6rem)" */
  height?: string;
}

export default function PageHero({
  page,
  defaultTitle,
  defaultSubtitle,
  defaultImage,
  height = "110vh",
}: PageHeroProps) {
  const [slide, setSlide] = useState<HeroSlide | null>(null);

  useEffect(() => {
    fetch(`/api/hero-slides?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        const slides = data.data || [];
        if (slides.length > 0) setSlide(slides[0]);
      })
      .catch(() => {});
  }, [page]);

  const heroImage = slide?.imageUrl || defaultImage;
  const heroTitle = slide?.title || defaultTitle;
  const heroSubtitle = slide?.subtitle || defaultSubtitle || null;
  const darkOverlay = slide?.darkOverlay ?? false;
  const overlayOpacity = slide?.overlayOpacity ?? 60;

  const textAlignH =
    slide?.position === "left"
      ? "items-start text-left pl-8 md:pl-20"
      : slide?.position === "right"
        ? "items-end text-right pr-8 md:pr-20"
        : "items-center text-center";

  const textAlignV =
    slide?.verticalPosition === "top"
      ? "top-20 bottom-auto"
      : slide?.verticalPosition === "bottom"
        ? "bottom-20 top-auto"
        : "top-1/2 -translate-y-1/2";

  return (
    <section
      className="relative w-full flex items-center justify-center bg-warm-900 overflow-hidden"
      style={{ minHeight: height }}
    >
      <Image
        src={heroImage}
        alt={heroTitle}
        fill
        className="object-cover"
        style={{ objectPosition: slide?.imagePosition || "center center" }}
        sizes="100vw"
        priority
      />

      {/* Overlay */}
      {darkOverlay ? (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity / 100 }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH} px-8`}
      >
        <h1 className="font-serif text-4xl md:text-5xl lg:text-[4rem] text-white leading-[1.2] tracking-tight">
          {heroTitle}
        </h1>
        {heroSubtitle && (
          <p className="text-lg md:text-xl text-white/80 font-light mt-4 max-w-2xl mx-auto">
            {heroSubtitle}
          </p>
        )}
        {slide?.ctaText && slide?.ctaLink && (
          <a
            href={slide.ctaLink}
            className="inline-block mt-6 uppercase text-[16px] tracking-[0.03em] text-white font-medium hover:text-white/80 hover:underline transition-colors"
          >
            {slide.ctaText} <span className="ml-1">&rarr;</span>
          </a>
        )}
      </motion.div>
    </section>
  );
}
