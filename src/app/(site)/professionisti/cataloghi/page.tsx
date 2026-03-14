"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/PageHero";
import type { Catalog } from "@/types";

export default function CataloghiPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalogs")
      .then((r) => r.json())
      .then((data) => { setCatalogs(data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cataloghiItems = catalogs.filter((c) => c.section === "cataloghi");
  const slowLivingItems = catalogs.filter((c) => c.section === "slow-living");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── Hero Section ────────────────────────────────────── */}
      <PageHero
        page="cataloghi"
        defaultTitle="Cataloghi"
        defaultImage="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=800&fit=crop"
      />

      {/* ── CATALOGHI SECTIONS ───────────────────────────────── */}
      {cataloghiItems.map((item, i) => (
        <div key={item.id}>
          {i > 0 && <div className="h-16 md:h-28" />}
          <CatalogSection item={item} imageRight={i % 2 === 0} />
        </div>
      ))}

      {/* ── SLOW LIVING MAGAZINE ─────────────────────────────── */}
      {slowLivingItems.length > 0 && (
        <>
          <div className="h-16 md:h-28" />

          <section className="pb-12 md:pb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center px-8 max-w-4xl mx-auto"
            >
              <h2 className="font-serif text-3xl md:text-5xl lg:text-[4rem] text-dark leading-[1.15] tracking-tight">
                Slow Living Magazine
              </h2>
            </motion.div>
          </section>

          <div className="h-8 md:h-16" />

          {slowLivingItems.map((item, i) => (
            <div key={item.id}>
              {i > 0 && <div className="h-16 md:h-28" />}
              <CatalogSection item={item} imageRight={i % 2 === 0} />
            </div>
          ))}
        </>
      )}

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container py-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">Home</Link>
          <ChevronRight size={10} />
          <Link href="/professionisti" className="hover:text-warm-700 transition-colors">Professionisti</Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Cataloghi</span>
        </nav>
      </div>
    </>
  );
}

function CatalogSection({ item, imageRight }: { item: Catalog; imageRight: boolean }) {
  const imageEl = (
    <div className="relative bg-warm-200 min-h-[400px]">
      {item.imageUrl && (
        <Image
          src={item.imageUrl}
          alt={item.title || item.name}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      )}
    </div>
  );

  const textEl = (
    <div className="px-10 md:px-16 lg:px-24 xl:px-32 py-16 lg:py-20 flex flex-col justify-center">
      {item.pretitle && (
        <p className="label-text mb-1.5">{item.pretitle}</p>
      )}
      {item.title && (
        <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl text-dark leading-[1.15] uppercase tracking-wide font-light">
          {item.title}
        </h2>
      )}
      {item.description && (
        <p className="text-lg text-dark leading-[1.8] font-light mt-5">
          {item.description}
        </p>
      )}
      <div className="mt-10">
        <a
          href={item.pdfUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 uppercase text-sm tracking-[0.2em] text-dark font-medium hover:underline underline-offset-4 hover:text-warm-500 transition-colors"
        >
          {item.linkText || "Scarica"} <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );

  return (
    <section className="w-full bg-warm-50" style={{ minHeight: "100vh" }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-0 h-full" style={{ minHeight: "100vh" }}>
        {imageRight ? (
          <>{textEl}{imageEl}</>
        ) : (
          <>{imageEl}{textEl}</>
        )}
      </div>
    </section>
  );
}
