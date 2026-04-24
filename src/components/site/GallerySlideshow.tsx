"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

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

  const goNext = () => { if (canGoNext) setCurrent((prev) => prev + 1); };
  const goPrev = () => { if (canGoPrev) setCurrent((prev) => prev - 1); };

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
          className="relative w-full overflow-hidden"
          style={{ height: "768px", cursor: cursorStyle }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverSide(null)}
        >
          {/* Slide track: tutte le immagini in riga, shift con translateX */}
          <div
            className="flex h-full w-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {images.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 w-full h-full">
                <Image
                  src={url}
                  alt={altMap[url] || `${name} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Alt text sotto l'immagine (centrato) */}
        <div className="px-4 lg:px-6 mt-4 min-h-[1.5em] text-center">
          <p className="text-[13px] text-warm-600 leading-snug">{currentAlt}</p>
        </div>

        {/* Progress bar */}
        <div className="px-10 lg:px-16 mt-3">
          <div className="relative h-[1px] bg-warm-200 w-full">
            <div
              className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-500 ease-out"
              style={{ width: `${100 / images.length}%`, transform: `translateX(${current * 100}%)` }}
            />
          </div>
        </div>

        <div className="text-center mt-3">
          <span className="text-[11px] text-warm-400 tracking-wider">
            {current + 1} / {images.length}
          </span>
        </div>
      </div>
    </section>
  );
}
