"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface BornInViennaProps {
  historicalImage: string;
}

export default function BornInVienna({ historicalImage }: BornInViennaProps) {
  return (
    <section className="w-full py-20 md:py-28 lg:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-start gap-0">
        {/* Left — big serif text (narrower, ~40%) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="lg:col-span-5 flex flex-col justify-start px-7 md:px-12 lg:px-16 py-16 lg:py-0"
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-dark leading-[1.15] font-normal">
            <em>Born</em> in Vienna.<br />
            Made in <em>Italy.</em><br />
            <em>Designed</em> around<br />
            the world.
          </h2>
          <Link
            href="/mondo-gtv"
            className="inline-block mt-[20px] uppercase text-[16px] tracking-[0.03em] !text-black font-normal transition-colors hover:text-accent hover:underline"
            style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
          >
            Scopri il mondo GTV &rarr;
          </Link>
        </motion.div>

        {/* Right — historical image (wider, ~60%, touches right edge) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="lg:col-span-7 relative"
          style={{ aspectRatio: "16 / 9" }}
        >
          <Image
            src={historicalImage}
            alt="Gebrüder Thonet Vienna — storia dal 1853"
            fill
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
