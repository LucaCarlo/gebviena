"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FullWidthBanner() {
  return (
    <section className="relative w-full" style={{ height: "90vh" }}>
      {/* Background image — dark scene */}
      <Image
        src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=2560&h=1700&fit=crop&q=90"
        alt="Sedute che invitano a restare"
        fill
        className="object-cover brightness-[0.6]"
      />

      {/* Text directly on the image — no background, white text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="absolute top-16 md:top-24 lg:top-28 left-8 md:left-16 lg:left-20"
      >
        <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-white font-light uppercase tracking-wide leading-snug">
          Sedute che invitano a restare,<br />
          momenti che prendono forma
        </h2>
        <Link
          href="/progetti"
          className="inline-flex items-center gap-2 mt-6 md:mt-8 uppercase text-sm tracking-[0.15em] font-light text-white hover:opacity-60 transition-opacity"
        >
          I migliori progetti
          <span className="text-lg">→</span>
        </Link>
      </motion.div>
    </section>
  );
}
