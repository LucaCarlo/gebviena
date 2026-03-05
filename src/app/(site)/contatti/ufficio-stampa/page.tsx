"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function UfficioStampaPage() {
  return (
    <>
      {/* ── TITLE SECTION ────────────────────────────────────── */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center px-8 max-w-4xl mx-auto"
        >
          <h1 className="font-serif text-3xl md:text-5xl lg:text-[4rem] text-dark leading-[1.15] tracking-tight">
            Ufficio Stampa
          </h1>
        </motion.div>
      </section>

      {/* spacer */}
      <div className="h-8 md:h-16" />

      {/* ── IMAGE + TEXT ─────────────────────────────────────── */}
      <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
          {/* Left: text */}
          <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
            <div className="text-lg text-dark leading-[1.8] font-light">
              <p>
                Per materiali stampa, interviste o altre informazioni ufficiali, contattateci a:
              </p>
              <p className="mt-8 font-sans text-xl md:text-2xl uppercase tracking-wide font-medium text-dark">
                Agence Melchior
              </p>
              <p className="mt-4">
                Debora Agostini:{" "}
                <a href="mailto:debora@agencemelchior.com" className="underline underline-offset-4 hover:text-warm-500 transition-colors">
                  debora@agencemelchior.com
                </a>
              </p>
              <p className="mt-2">
                Allegra Emilia Amatori:{" "}
                <a href="mailto:allegra@agencemelchior.com" className="underline underline-offset-4 hover:text-warm-500 transition-colors">
                  allegra@agencemelchior.com
                </a>
              </p>
            </div>
          </div>
          {/* Right: image */}
          <div className="relative bg-warm-200 min-h-[400px]">
            <Image
              src="/images/PEERS-design-by-Front-for-GTV-2-1024x768.jpg"
              alt="Ufficio Stampa"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container py-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/contatti" className="hover:text-warm-700 transition-colors">Contatti</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Ufficio Stampa</span>
        </nav>
      </div>
    </>
  );
}
