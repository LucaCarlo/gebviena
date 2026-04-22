"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";

interface ProductSpotlightProps {
  ambianceImage: string;
  productImage: string;
  ctaLink?: string;
}

export default function ProductSpotlight({ ambianceImage, productImage, ctaLink }: ProductSpotlightProps) {
  const t = useT();
  const lang = useLang();
  const href = ctaLink && ctaLink.trim()
    ? (/^https?:\/\//.test(ctaLink) ? ctaLink : localizePath(ctaLink, lang))
    : localizePath("/prodotti", lang);
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start">
        {/* Left — tall vertical image, full bleed, taller than right */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative "
          style={{ aspectRatio: "3 / 4.2" }}
        >
          <Image
            src={ambianceImage}
            alt="Thonet ambiance"
            fill
            className="object-cover"
          />
        </motion.div>

        {/* Right — product image centered with white space + text below centered */}
        <div className="flex flex-col items-center justify-center py-16 lg:py-24 px-0 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative w-full max-w-[82%] "
            style={{ aspectRatio: "3 / 4" }}
          >
            <Image
              src={productImage}
              alt="Sedia Thonet"
              fill
              className="object-cover"
            />
          </motion.div>

          {/* Text centered below the image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mt-8 lg:mt-10"
          >
            <p
              className="uppercase text-[16px] tracking-[0.03em] !text-black mb-[8px] mt-[6px] font-light"
            >
              {t("home.spotlight.label")}
            </p>
            <h2 className="font-sans text-[28px] !text-black leading-[1.15] font-light uppercase tracking-[inherit] whitespace-pre-line">
              {t("home.spotlight.title")}
            </h2>
            <Link
              href={href}
              className="inline-block mt-[20px] uppercase text-[16px] tracking-[0.03em] !text-black font-medium transition-colors hover:text-accent hover:underline"
              style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
            >
              {t("home.spotlight.cta")} &rarr;
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
