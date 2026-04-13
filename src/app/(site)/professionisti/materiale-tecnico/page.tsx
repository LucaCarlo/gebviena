"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Minus, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductSheet {
  id: string;
  name: string;
  designerName: string;
  techSheetUrl: string;
  category: string | null;
}

const CATEGORY_ORDER = ["SEDUTE", "IMBOTTITI", "COMPLEMENTI", "TAVOLI", "OUTDOOR"];

export default function MaterialeTecnicoPage() {
  const [products, setProducts] = useState<ProductSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products/tech-sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Group products by primary category (uppercase, first token of category field)
  const grouped = new Map<string, ProductSheet[]>();
  for (const p of products) {
    const cat = (p.category || "").split(",")[0].trim().toUpperCase() || "ALTRO";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }
  const categories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <>
      {/* ── Tabs nav ─────────────────────────────────────────── */}
      <section className="pt-12 md:pt-16 pb-8">
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/professionisti/cataloghi"
            className="px-4 py-1.5 rounded-full border border-warm-200 bg-warm-50 text-[13px] tracking-[0.02em] text-warm-700 hover:bg-warm-100 transition-colors"
          >
            Modelli 2D e 3D
          </Link>
          <span className="px-4 py-1.5 rounded-full border border-black bg-white text-[13px] tracking-[0.02em] text-black">
            Schede Tecniche
          </span>
        </div>
      </section>

      {/* ── Titolo + Accordion per categoria ─────────────────── */}
      <section className="pb-16 lg:pb-24" style={{ backgroundColor: "#f9f8f6" }}>
        <div className="gtv-container py-16 lg:py-20">
          <div className="text-center mb-12">
            <h1 className="font-sans text-[38px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              Schede Tecniche
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {loading ? (
              <div className="py-20 text-center text-warm-400 text-sm">Caricamento...</div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-warm-400 text-sm">Nessuna scheda tecnica disponibile.</div>
            ) : (
              <div className="divide-y divide-black border-t border-b border-black">
                {categories.map((cat) => {
                  const items = grouped.get(cat) || [];
                  const isOpen = openCategory === cat;
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => setOpenCategory(isOpen ? null : cat)}
                        className="w-full flex items-center justify-between py-5 px-2 group"
                      >
                        <span className="uppercase text-[20px] tracking-[0.03em] text-black font-light">
                          {cat}
                        </span>
                        <span className="w-10 h-10 border border-black flex items-center justify-center text-black flex-shrink-0">
                          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                        </span>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2 pb-8">
                              <div className="divide-y divide-warm-200">
                                {items.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between py-4 gap-4"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="uppercase text-[14px] tracking-[0.05em] text-black font-light">
                                        {p.name}
                                      </span>
                                      {p.designerName && (
                                        <span className="text-[12px] text-warm-500 ml-3">
                                          {p.designerName}
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={p.techSheetUrl}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 uppercase text-[12px] tracking-[0.1em] text-black hover:text-accent transition-colors group flex-shrink-0"
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
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Breadcrumbs — stile mondo-gtv ────────────────────── */}
      <div className="gtv-container pt-8 pb-[27px]">
        <div className="flex items-center justify-start gap-2 text-[14px] tracking-normal text-black font-light">
          <Link href="/">Home</Link>
          <span>&gt;</span>
          <Link href="/professionisti">Professionisti</Link>
          <span>&gt;</span>
          <span>Schede Tecniche</span>
        </div>
      </div>
    </>
  );
}
