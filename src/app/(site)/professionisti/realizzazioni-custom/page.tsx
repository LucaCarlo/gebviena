"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function RealizzazioniCustomPage() {
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
            Realizzazioni Custom
          </h1>
        </motion.div>
      </section>

      {/* spacer */}
      <div className="h-8 md:h-16" />

      {/* ── IMAGE + TEXT (same layout as rassegna stampa detail) ── */}
      <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
          {/* Left: image */}
          <div className="relative bg-warm-200 min-h-[400px]">
            <Image
              src="/images/professionisti-realizzazioni.webp"
              alt="Realizzazioni Custom"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          {/* Right: text + CTA */}
          <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
            <div className="text-lg text-dark leading-[1.8] font-light">
              <p>
                GTV mette il proprio know-how al servizio di architetti e
                designer per realizzazioni su misura. Dallo sviluppo di
                finiture esclusive alla creazione di arredi personalizzati,
                offriamo soluzioni su misura per progetti contract e
                residenziali. Contattaci per una consulenza dedicata.
              </p>
            </div>
            <div className="mt-10">
              <Link
                href="/contatti/richiesta-info"
                className="inline-flex items-center gap-2 uppercase text-sm tracking-[0.2em] text-dark font-medium hover:text-warm-500 transition-colors"
              >
                Scrivici <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container py-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/professionisti" className="hover:text-warm-700 transition-colors">Professionisti</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Realizzazioni Custom</span>
        </nav>
      </div>
    </>
  );
}
