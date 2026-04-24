"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/contexts/I18nContext";
import type { HeroSlide } from "@/types";

export default function StoreHeroSection() {
  const lang = useLang();
  const [slide, setSlide] = useState<HeroSlide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/hero-slides?page=store-home&lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        const fetched = (data.data || []) as HeroSlide[];
        setSlide(fetched[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  // Altezza più contenuta (~50vh desktop / 40vh mobile) per far vedere subito
  // i prodotti sotto, come richiesto.
  const HERO_HEIGHT = "h-[45vh] min-h-[320px] max-h-[520px]";

  if (loading) {
    return (
      <section className={`relative w-full bg-warm-100 ${HERO_HEIGHT}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  if (!slide) {
    // Nessuno slide configurato → fallback minimale (non mostra niente di rotto)
    return (
      <section className="border-b border-warm-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-warm-500 mb-3">
            Gebrüder Thonet Vienna · Shop online
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-warm-900">
            Design viennese, ordinabile a casa tua
          </h1>
        </div>
      </section>
    );
  }

  const textAlignH =
    slide.position === "left"
      ? "items-start text-left pl-6 md:pl-16"
      : slide.position === "right"
      ? "items-end text-right pr-6 md:pr-16"
      : "items-center text-center";

  const textAlignV =
    slide.verticalPosition === "top"
      ? "top-8 md:top-12"
      : slide.verticalPosition === "bottom"
      ? "bottom-8 md:bottom-12"
      : "top-1/2 -translate-y-1/2";

  return (
    <section className={`relative w-full overflow-hidden ${HERO_HEIGHT}`}>
      <Image
        src={slide.imageUrl}
        alt={slide.title || "Gebrüder Thonet Vienna Store"}
        fill
        className="object-cover"
        style={{ objectPosition: slide.imagePosition || "center center" }}
        priority
        sizes="100vw"
      />

      {/* Leggero scurimento base per leggibilità */}
      <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: 0.1 }} />
      {slide.darkOverlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (slide.overlayOpacity ?? 60) / 100 }}
        />
      )}

      <div className={`absolute ${textAlignV} left-0 right-0 flex flex-col ${textAlignH}`}>
        {slide.title && (
          <h1
            className={`font-sans text-2xl md:text-3xl lg:text-4xl leading-tight font-light uppercase ${
              slide.textColor === "black" ? "text-black" : "text-white"
            }`}
          >
            {slide.title}
          </h1>
        )}
        {slide.subtitle && (
          <p
            className={`text-sm md:text-base mt-2 max-w-2xl ${
              slide.textColor === "black" ? "text-black/70" : "text-white/80"
            }`}
          >
            {slide.subtitle}
          </p>
        )}
        {slide.ctaText && slide.ctaLink && (
          <Link
            href={slide.ctaLink}
            className={`inline-block mt-4 uppercase text-[13px] tracking-[0.2em] ${
              slide.textColor === "black" ? "text-black hover:text-black/70" : "text-white hover:text-white/80"
            } border-b border-current pb-0.5`}
          >
            {slide.ctaText} &rarr;
          </Link>
        )}
      </div>
    </section>
  );
}
