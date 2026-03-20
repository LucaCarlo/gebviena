"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface FullWidthBannerProps {
  bannerImage: string;
}

export default function FullWidthBanner({ bannerImage }: FullWidthBannerProps) {
  return (
    <section className="relative w-full" style={{ height: "85vh" }}>
      {/* Background image — dark scene */}
      <Image
        src={bannerImage}
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
        className="absolute top-14 md:top-18 lg:top-22 left-7 md:left-12 lg:left-16"
      >
        <h2 className="font-sans text-2xl md:text-3xl lg:text-[38px] text-white/80 font-light uppercase tracking-[inherit] leading-snug">
          Sedute che invitano a restare,<br />
          momenti che prendono forma
        </h2>
        <Link
          href="/progetti"
          className="inline-block mt-[16px] uppercase text-[16px] tracking-[0.03em] text-white font-normal transition-colors hover:underline"
          style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
        >
          I migliori progetti &rarr;
        </Link>
      </motion.div>
    </section>
  );
}
