"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ExperienceCarouselProps {
  images: { src: string; alt: string }[];
}

const ARROW_RIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M16 22 L28 22 M23 17 L28 22 L23 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer";

const ARROW_LEFT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M28 22 L16 22 M21 17 L16 22 L21 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer";

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
    if (x < rect.width / 3) setHoverSide("left");
    else if (x > (rect.width * 2) / 3) setHoverSide("right");
    else setHoverSide(null);
  };

  const handleClick = () => {
    if (hoverSide === "left") goPrev();
    else if (hoverSide === "right") goNext();
  };

  const cursorStyle = hoverSide === "left" ? ARROW_LEFT : hoverSide === "right" ? ARROW_RIGHT : "pointer";

  return (
    <section className="pt-8 md:pt-12 pb-16 md:pb-24">
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

        {/* Progress bar — overlay nera con clip-path */}
        {total > 1 && (
          <div className="max-w-[780px] mx-auto mt-8 px-4">
            <div className="relative h-[1px] bg-warm-200 w-full">
              <div
                className="absolute left-0 bg-warm-900"
                style={{
                  top: "-0.5px",
                  height: "2px",
                  width: "100%",
                  clipPath: `inset(0 ${((total - 1 - current) / total) * 100}% 0 ${(current / total) * 100}%)`,
                  transition: "clip-path 500ms ease-out",
                }}
              />
            </div>
          </div>
        )}

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
