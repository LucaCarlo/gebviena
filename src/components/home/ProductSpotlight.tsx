"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductSpotlight() {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start">
        {/* Left — tall vertical image, full bleed, taller than right */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative img-hover"
          style={{ aspectRatio: "3 / 4.2" }}
        >
          <Image
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=2000&fit=crop&q=85"
            alt="Thonet ambiance"
            fill
            className="object-cover"
          />
        </motion.div>

        {/* Right — product image centered with white space + text below centered */}
        <div className="flex flex-col items-center justify-center py-16 lg:py-24 px-10 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative w-full max-w-[75%] img-hover"
            style={{ aspectRatio: "3 / 4" }}
          >
            <Image
              src="https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=900&h=1200&fit=crop&q=85"
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
            className="text-center mt-10 lg:mt-14"
          >
            <p className="uppercase text-[11px] tracking-[0.2em] text-neutral-400 mb-5 font-light">
              Icona del design
            </p>
            <h2 className="font-sans text-xl md:text-2xl lg:text-3xl text-dark leading-snug font-light uppercase tracking-wide">
              L&apos;eleganza<br />
              senza tempo<br />
              del legno curvato
            </h2>
            <Link href="/prodotti" className="gtv-link mt-8">
              Scopri il prodotto →
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
