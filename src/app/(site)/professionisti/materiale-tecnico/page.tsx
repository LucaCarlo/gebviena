"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/PageHero";

interface ProductSheet {
  id: string;
  name: string;
  designerName: string;
  techSheetUrl: string;
}

export default function MaterialeTecnicoPage() {
  const [products, setProducts] = useState<ProductSheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/tech-sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* ── Hero Section ────────────────────────────────────── */}
      <PageHero
        page="materiale-tecnico"
        defaultTitle="Schede Tecniche"
        defaultImage="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=800&fit=crop"
      />

      {/* ── PRODUCT LIST ─────────────────────────────────────── */}
      <section className="gtv-container pb-16 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {loading ? (
            <div className="py-20 text-center text-warm-400 text-sm">
              Caricamento...
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center text-warm-400 text-sm">
              Nessuna scheda tecnica disponibile.
            </div>
          ) : (
            <div className="divide-y divide-warm-900 border-t border-b border-warm-900">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between py-5 px-2 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <span className="uppercase text-xs tracking-[0.15em] text-warm-900">
                      {product.name}
                    </span>
                    {product.designerName && (
                      <span className="text-xs text-warm-400 ml-3">
                        {product.designerName}
                      </span>
                    )}
                  </div>
                  <a
                    href={product.techSheetUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 uppercase text-xs tracking-[0.15em] text-warm-800 hover:text-accent transition-colors group flex-shrink-0"
                  >
                    Download
                    <Download
                      size={14}
                      className="transition-transform group-hover:translate-y-0.5"
                    />
                  </a>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* ── BREADCRUMBS ──────────────────────────────────────── */}
      <div className="gtv-container py-12">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-warm-400">
          <Link href="/" className="hover:text-warm-700 transition-colors">
            Home
          </Link>
          <ChevronRight size={10} />
          <Link
            href="/professionisti"
            className="hover:text-warm-700 transition-colors"
          >
            Professionisti
          </Link>
          <ChevronRight size={10} />
          <span className="text-warm-600">Schede Tecniche</span>
        </nav>
      </div>
    </>
  );
}
