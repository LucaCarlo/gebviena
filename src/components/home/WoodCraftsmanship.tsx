"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface WoodCraftsmanshipProps {
  videoUrl: string;
}

export default function WoodCraftsmanship({ videoUrl }: WoodCraftsmanshipProps) {
  return (
    <section className="w-full px-1 md:px-2 lg:px-3">
      <div className="relative w-full" style={{ height: "90vh" }}>
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src={videoUrl}
            type="video/mp4"
          />
        </video>

        {/* Slight dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Text overlay — top left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="absolute top-14 md:top-18 lg:top-22 left-7 md:left-12 lg:left-16"
        >
          <h2 className="font-sans text-2xl md:text-3xl lg:text-[38px] text-white/80 font-light uppercase tracking-[inherit] leading-snug">
            L&apos;armonia del legno
          </h2>
          <Link
            href="/mondo-gtv"
            className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-medium transition-colors hover:underline"
            style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
          >
            Scopri l&apos;arte del legno curvato &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
