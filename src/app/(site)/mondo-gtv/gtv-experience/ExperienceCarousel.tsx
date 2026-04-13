"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ExperienceCarouselProps {
  images: { src: string; alt: string }[];
}

const ARROW_RIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='29' fill='white' fill-opacity='0.0' stroke='white' stroke-width='1'/%3E%3Cpath d='M22 30 L38 30 M32 24 L38 30 L32 36' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E\") 30 30, pointer";

const ARROW_LEFT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='29' fill='white' fill-opacity='0.0' stroke='white' stroke-width='1'/%3E%3Cpath d='M38 30 L22 30 M28 24 L22 30 L28 36' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E\") 30 30, pointer";

export default function ExperienceCarousel({ images }: ExperienceCarouselProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);

  const total = images.length;
  if (total === 0) return null;

  const goNext = () => setCurrent((prev) => (prev + 1) % total);
  const goPrev = () => setCurrent((prev) => (prev - 1 + total) % total);

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

  const cursorStyle = hoverSide === "left" ? ARROW_LEFT : ARROW_RIGHT;

  return (
    <section className="py-16 md:py-24">
      <div className="w-full">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden bg-warm-100"
          style={{ aspectRatio: "2 / 1", cursor: cursorStyle }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverSide(null)}
        >
          {images.map((img, i) => (
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
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                draggable={false}
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
              style={{ width: `${100 / total}%`, transform: `translateX(${current * 100}%)` }}
            />
          </div>
        </div>

        {/* Counter */}
        <div className="text-center mt-4">
          <span className="text-[11px] text-warm-400 tracking-wider">
            {current + 1} / {total}
          </span>
        </div>
      </div>
    </section>
  );
}
