"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import CarouselProgressBar from "@/components/site/CarouselProgressBar";

interface GallerySlideshowProps {
  images: string[];
  name: string;
  id?: string;
}

export default function GallerySlideshow({ images, name, id }: GallerySlideshowProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [altMap, setAltMap] = useState<Record<string, string>>({});
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    if (images.length === 0) return;
    fetch("/api/media/alt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: images }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAltMap(d.data || {}); })
      .catch(() => { /* silent */ });
  }, [images]);

  const canGoPrev = current > 0;
  const canGoNext = current < images.length - 1;

  const goNext = () => { if (canGoNext) { setCurrent((prev) => prev + 1); setShowAlt(false); } };
  const goPrev = () => { if (canGoPrev) { setCurrent((prev) => prev - 1); setShowAlt(false); } };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) setHoverSide("left");
    else if (x > (rect.width * 2) / 3) setHoverSide("right");
    else setHoverSide(null);
  };

  const handleClick = () => {
    if (hoverSide === "left" && canGoPrev) goPrev();
    else if (hoverSide === "right" && canGoNext) goNext();
  };

  const cursorStyle = (hoverSide === "left" && canGoPrev)
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M28 22 L16 22 M21 17 L16 22 L21 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : (hoverSide === "right" && canGoNext)
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M16 22 L28 22 M23 17 L28 22 L23 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : "default";

  if (images.length === 0) return null;

  const currentAlt = altMap[images[current]] || `${name} ${current + 1}`;

  return (
    <section id={id} className="pb-16 lg:pb-24">
      <div className="w-full">
        <div
          ref={containerRef}
          className="group relative w-full overflow-hidden aspect-video lg:aspect-auto lg:h-[768px]"
          style={{ cursor: cursorStyle }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoverSide(null); setShowAlt(false); }}
        >
          {/* Slide track: tutte le immagini in riga, shift con translateX */}
          <div
            className="flex h-full w-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {images.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 w-full h-full bg-warm-50">
                <Image
                  src={url}
                  alt={altMap[url] || `${name} ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>

          {/* Icona info in basso a sinistra: invisibile, compare solo in hover.
              Click → mostra/nasconde l'alt-text dell'immagine corrente. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowAlt((v) => !v); }}
            aria-label="Info immagine"
            className="absolute bottom-3 left-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-warm-900 shadow cursor-pointer opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-white"
          >
            <Info size={16} />
          </button>
          {showAlt && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-14 left-3 z-10 max-w-[min(85%,460px)] bg-white/95 backdrop-blur px-3.5 py-2.5 rounded-lg shadow-md"
            >
              <p className="text-[13px] text-warm-700 leading-snug">{currentAlt}</p>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <CarouselProgressBar
            progress={images.length > 1 ? current / (images.length - 1) : 0}
            visibleFraction={1 / images.length}
            className="mt-3"
            transitionMs={500}
          />
        )}

        <div className="text-center mt-3">
          <span className="text-[11px] text-warm-400 tracking-wider">
            {current + 1} / {images.length}
          </span>
        </div>
      </div>
    </section>
  );
}
