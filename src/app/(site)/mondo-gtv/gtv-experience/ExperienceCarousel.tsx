"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface ExperienceCarouselProps {
  images: { src: string; alt: string }[];
}

export default function ExperienceCarousel({ images }: ExperienceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const hasDragged = useRef(false);

  const total = images.length;

  /* ── Snap to nearest slide ───────────────────────────────── */
  const snapToSlide = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(index, total - 1));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
      setCurrentIndex(clamped);
    },
    [total],
  );

  /* ── Track current slide on scroll ───────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (el.clientWidth > 0) {
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          setCurrentIndex(Math.max(0, Math.min(idx, total - 1)));
        }
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [total]);

  /* ── Mouse drag ──────────────────────────────────────────── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    dragStartScroll.current = el.scrollLeft;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const el = scrollRef.current;
      if (!el) return;
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 5) hasDragged.current = true;
      el.scrollLeft = dragStartScroll.current - dx;
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const el = scrollRef.current;
    if (!el || !hasDragged.current) return;

    const dx = el.scrollLeft - dragStartScroll.current;
    const threshold = el.clientWidth * 0.15;
    let target = currentIndex;
    if (dx > threshold) target = currentIndex + 1;
    else if (dx < -threshold) target = currentIndex - 1;
    snapToSlide(target);
  }, [isDragging, currentIndex, snapToSlide]);

  /* ── Mouse wheel → horizontal scroll ────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        snapToSlide(currentIndex + direction);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [currentIndex, snapToSlide]);

  /* ── Touch support ──────────────────────────────────────── */
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 50;
      if (dx < -threshold) snapToSlide(currentIndex + 1);
      else if (dx > threshold) snapToSlide(currentIndex - 1);
      else snapToSlide(currentIndex);
    },
    [currentIndex, snapToSlide],
  );

  if (total === 0) return null;

  const progress = total > 1 ? currentIndex / (total - 1) : 0;

  return (
    <section className="py-16 md:py-24">
      <div className="relative overflow-hidden">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex overflow-x-auto ${
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "none",
          }}
        >
          {images.map((img, i) => (
            <div key={i} className="flex-shrink-0 w-full">
              <div
                className="relative w-full bg-warm-100 overflow-hidden"
                style={{ aspectRatio: "2 / 1" }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  draggable={false}
                  sizes="100vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="gtv-container mt-8">
        <div className="relative h-[1px] bg-warm-200 w-full max-w-3xl mx-auto">
          <div
            className="absolute top-0 left-0 h-full bg-warm-800 transition-all duration-300 ease-out"
            style={{
              width: `${100 / total}%`,
              transform: `translateX(${progress * (total - 1) * 100}%)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
