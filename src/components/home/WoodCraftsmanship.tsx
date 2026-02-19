"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function WoodCraftsmanship() {
  return (
    <section className="relative w-full" style={{ height: "90vh" }}>
      {/* Background video — full bleed, autoplay, muted, looping */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://assets.mixkit.co/videos/44862/44862-720.mp4"
          type="video/mp4"
        />
      </video>

      {/* Slight dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Text overlay — top left, directly on the video */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="absolute top-16 md:top-24 lg:top-28 left-8 md:left-16 lg:left-20"
      >
        <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-white font-light uppercase tracking-wide leading-snug">
          L&apos;armonia del legno
        </h2>
        <Link
          href="/mondo-gtv"
          className="inline-flex items-center gap-2 mt-6 md:mt-8 uppercase text-sm tracking-[0.15em] font-light text-white hover:opacity-60 transition-opacity"
        >
          Scopri l&apos;arte del legno curvato
          <span className="text-lg">→</span>
        </Link>
      </motion.div>
    </section>
  );
}
