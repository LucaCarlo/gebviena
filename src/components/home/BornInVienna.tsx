"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BornInVienna() {
  return (
    <section className="w-full py-20 md:py-28 lg:py-36">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-0">
        {/* Left — big serif text (narrower, ~40%) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="lg:col-span-5 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-16 lg:py-0"
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-dark leading-[1.15] font-normal">
            <em>Born</em> in Vienna.<br />
            Made in <em>Italy.</em><br />
            <em>Designed</em> around<br />
            the world.
          </h2>
          <Link
            href="/mondo-gtv"
            className="inline-flex items-center gap-3 mt-10 uppercase text-sm tracking-[0.15em] font-light text-dark hover:opacity-60 transition-opacity"
          >
            Scopri il mondo GTV
            <span className="text-lg">→</span>
          </Link>
        </motion.div>

        {/* Right — historical image (wider, ~60%, touches right edge) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="lg:col-span-7 relative"
          style={{ aspectRatio: "16 / 10" }}
        >
          <Image
            src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1400&h=900&fit=crop&q=85"
            alt="Gebrüder Thonet Vienna — storia dal 1853"
            fill
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
