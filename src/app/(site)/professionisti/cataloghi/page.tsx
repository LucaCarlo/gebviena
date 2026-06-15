"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useT, useLang } from "@/contexts/I18nContext";
import { localizePath } from "@/lib/path-segments";
import type { Catalog } from "@/types";

interface Category {
  slug: string;
  label: string;
  sortOrder: number;
  showInPublic: boolean;
}

export default function CataloghiPage() {
  const t = useT();
  const lang = useLang();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("__all__");

  useEffect(() => {
    Promise.all([
      fetch("/api/catalogs").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/catalog-categories?scope=public").then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([catRes, catgRes]) => {
      setCatalogs((catRes.data || []) as Catalog[]);
      setCategories((catgRes.data || []) as Category[]);
    }).finally(() => setLoading(false));
  }, []);

  // Categorie effettivamente popolate (esistono cataloghi in quella categoria)
  const visibleCategories = useMemo(() => {
    const usedSlugs = new Set(catalogs.map((c) => c.section));
    return categories.filter((c) => usedSlugs.has(c.slug));
  }, [catalogs, categories]);

  const sectionsToRender = filter === "__all__"
    ? visibleCategories
    : visibleCategories.filter((c) => c.slug === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── Titolo ────────────────────────────────────────────── */}
      <section className="pt-16 md:pt-20 pb-8 md:pb-10">
        <div className="gtv-container">
          <h1 className="font-serif text-[40px] md:text-[58px] text-black tracking-normal text-center">
            {t("cataloghi.title")}
          </h1>
        </div>
      </section>

      {/* ── Filtri pill (solo se ci sono almeno 2 categorie) ── */}
      {visibleCategories.length > 1 && (
        <section className="pb-8 md:pb-12">
          <div className="gtv-container flex flex-wrap justify-center gap-2">
            <FilterPill active={filter === "__all__"} onClick={() => setFilter("__all__")}>{t("common.all") === "common.all" ? "Tutti" : t("common.all")}</FilterPill>
            {visibleCategories.map((c) => (
              <FilterPill key={c.slug} active={filter === c.slug} onClick={() => setFilter(c.slug)}>{c.label}</FilterPill>
            ))}
          </div>
        </section>
      )}

      {/* ── Sezioni dinamiche ─────────────────────────────────── */}
      {sectionsToRender.map((cat, ci) => {
        const items = catalogs.filter((c) => c.section === cat.slug);
        if (items.length === 0) return null;
        // Mostra il titolone della categoria SOLO se NON è la prima E siamo in "tutti"
        const showTitle = filter === "__all__" && ci > 0;
        return (
          <div key={cat.slug}>
            {showTitle && (
              <section className="pt-20 md:pt-28 pb-12 md:pb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center px-8 max-w-4xl mx-auto"
                >
                  <h2 className="font-serif text-[40px] md:text-[58px] text-black tracking-normal">{cat.label}</h2>
                </motion.div>
              </section>
            )}
            {items.map((item, i) => (
              <CatalogSection key={item.id} item={item} textLeft={i % 2 === 0} />
            ))}
          </div>
        );
      })}

      {/* ── Breadcrumbs ────────────────────────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href={localizePath("/", lang)}>{t("common.breadcrumb_home")}</Link>
          <span>&gt;</span>
          <Link href={localizePath("/professionisti", lang)}>{t("nav.professionals")}</Link>
          <span>&gt;</span>
          <span>{t("cataloghi.breadcrumb")}</span>
        </div>
      </div>
    </>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 text-[13px] uppercase tracking-[0.1em] transition-colors border ${
        active
          ? "bg-black text-white border-black"
          : "bg-transparent text-black border-warm-300 hover:bg-warm-100"
      }`}
    >
      {children}
    </button>
  );
}

function CatalogSection({ item, textLeft }: { item: Catalog; textLeft: boolean }) {
  const t = useT();
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
    <div className="flex flex-col justify-center px-6 py-12 lg:px-[150px] lg:py-24">
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
        {item.linkText || t("common.download")} &rarr;
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
