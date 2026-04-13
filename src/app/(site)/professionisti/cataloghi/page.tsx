"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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

      {/* ── CATALOGHI SECTIONS — alternati testo sx/dx ───────── */}
      {cataloghiItems.map((item, i) => (
        <CatalogSection key={item.id} item={item} textLeft={i % 2 === 0} />
      ))}

      {/* ── SLOW LIVING MAGAZINE ─────────────────────────────── */}
      {slowLivingItems.length > 0 && (
        <>
          <section className="pt-20 md:pt-28 pb-12 md:pb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center px-8 max-w-4xl mx-auto"
            >
              <h2 className="font-serif text-[58px] text-black tracking-normal">
                Slow Living Magazine
              </h2>
            </motion.div>
          </section>

          {slowLivingItems.map((item, i) => (
            <CatalogSection key={item.id} item={item} textLeft={i % 2 === 0} />
          ))}
        </>
      )}

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/professionisti">Professionisti</Link>
          <span>&gt;</span>
          <span>Cataloghi</span>
        </div>
      </div>
    </>
  );
}

function CatalogSection({ item, textLeft }: { item: Catalog; textLeft: boolean }) {
  const imageEl = (
    <div className="relative overflow-hidden" style={{ aspectRatio: "3 / 4.2" }}>
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
    <div className="flex flex-col justify-center" style={{ padding: "96px 150px" }}>
      {item.pretitle && (
        <p className="uppercase text-[16px] tracking-[0.03em] text-black font-light mb-1.5">
          {item.pretitle}
        </p>
      )}
      {item.title && (
        <h2 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
          {item.title}
        </h2>
      )}
      {item.description && (
        <p className="text-[20px] text-black leading-snug font-light tracking-normal mt-8">
          {item.description}
        </p>
      )}
      <a
        href={item.pdfUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-8 uppercase text-[16px] tracking-[0.03em] text-black font-medium hover:underline w-fit"
        style={{ textUnderlineOffset: "8px", textDecorationThickness: "0.5px" }}
      >
        {item.linkText || "Scarica"} &rarr;
      </a>
    </div>
  );

  return (
    <section className="w-full bg-warm-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
        {textLeft ? (
          <>{textEl}{imageEl}</>
        ) : (
          <>{imageEl}{textEl}</>
        )}
      </div>
    </section>
  );
}
