"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface FeaturedProductProps {
  ambianceImage: string;
  productImage: string;
}

export default function FeaturedProduct({ ambianceImage, productImage }: FeaturedProductProps) {
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
            src={ambianceImage}
            alt="Kipferl ambiance"
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
              src={productImage}
              alt="Kipferl sofa"
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
            <p className="uppercase text-sm tracking-[0.08em] text-neutral-400 mb-5 font-light">
              Nuovo prodotto
            </p>
            <h2 className="font-sans text-xl md:text-2xl lg:text-3xl text-dark leading-snug font-light uppercase tracking-wide">
              Una silhouette<br />
              morbida<br />
              e accogliente
            </h2>
            <Link href="/prodotti" className="inline-block mt-8 uppercase text-sm tracking-[0.08em] text-dark font-normal border-b border-current transition-colors hover:text-accent" style={{ paddingBottom: "8px" }}>
              Scopri il prodotto &rarr;
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
