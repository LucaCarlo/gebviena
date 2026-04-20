"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";

interface WoodCraftsmanshipProps {
  videoUrl: string;
}

export default function WoodCraftsmanship({ videoUrl }: WoodCraftsmanshipProps) {
  const t = useT();
  const lang = useLang();
  return (
    <section className="w-full px-1 md:px-2 lg:px-3">
      <div className="relative w-full h-[min(90vh,900px)] max-md:h-[70vh]">
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
            {t("home.wood.title")}
          </h2>
          <Link
            href={localizePath("/mondo-gtv", lang)}
            className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-medium transition-colors hover:underline"
            style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
          >
            {t("home.wood.cta")} &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
