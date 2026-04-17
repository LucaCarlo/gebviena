"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface GallerySlideshowProps {
  images: string[];
  name: string;
  id?: string;
}

export default function GallerySlideshow({ images, name, id }: GallerySlideshowProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);

  const goNext = () => setCurrent((prev) => (prev + 1) % images.length);
  const goPrev = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

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

  const cursorStyle = hoverSide === "left"
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M28 22 L16 22 M21 17 L16 22 L21 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : hoverSide === "right"
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='21' fill='white' fill-opacity='0.85' stroke='black' stroke-width='1'/%3E%3Cpath d='M16 22 L28 22 M23 17 L28 22 L23 27' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E\") 22 22, pointer"
    : "pointer";

  if (images.length === 0) return null;

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
          {images.map((url, i) => (
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
                src={url}
                alt={`${name} ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </motion.div>
          ))}
        </div>

        <div className="gtv-container mt-8">
          <div className="relative h-[1px] bg-warm-200 w-full max-w-3xl mx-auto">
            <div
              className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-500 ease-out"
              style={{ width: `${100 / images.length}%`, transform: `translateX(${current * 100}%)` }}
            />
          </div>
        </div>

        <div className="text-center mt-4">
          <span className="text-[11px] text-warm-400 tracking-wider">
            {current + 1} / {images.length}
          </span>
        </div>
      </div>
    </section>
  );
}
