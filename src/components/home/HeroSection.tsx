"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full" style={{ height: "115vh" }}>
      <Image
        src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=2560&h=1707&fit=crop&q=90"
        alt="Un omaggio alla tradizione viennese"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Text below the fold — only visible after scrolling */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-20 left-0 right-0 text-center"
      >
        <h1 className="font-sans text-xl md:text-2xl lg:text-3xl text-white/80 leading-snug font-light uppercase tracking-wide">
          Un omaggio alla tradizione viennese
        </h1>
        <Link
          href="/prodotti"
          className="inline-block mt-4 uppercase text-sm md:text-base tracking-[0.25em] text-white font-medium hover:text-white/80 transition-colors"
        >
          Kipferl by Antenna <span className="ml-1">→</span>
        </Link>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 right-8"
      >
        <div className="w-5 h-8 border border-white/50 rounded-full flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1 h-1 bg-white rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
