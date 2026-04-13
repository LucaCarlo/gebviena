"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Minus, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductSheet {
  id: string;
  name: string;
  designerName: string;
  techSheetUrl: string | null;
  model2dUrl: string | null;
  model3dUrl: string | null;
  category: string | null;
}

const CATEGORY_ORDER = ["SEDUTE", "IMBOTTITI", "COMPLEMENTI", "TAVOLI", "OUTDOOR"];

type Tab = "modelli" | "schede";

export default function MaterialeTecnicoPage() {
  const [products, setProducts] = useState<ProductSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("schede");

  useEffect(() => {
    fetch("/api/products/tech-sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter products by tab availability
  const filtered = useMemo(() => {
    if (tab === "schede") return products.filter((p) => p.techSheetUrl?.trim());
    return products.filter((p) => p.model2dUrl?.trim() || p.model3dUrl?.trim());
  }, [products, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductSheet[]>();
    for (const p of filtered) {
      const cat = (p.category || "").split(",")[0].trim().toUpperCase() || "ALTRO";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  const categories = useMemo(() => {
    return [
      ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
      ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
  }, [grouped]);

  // Reset open accordion when tab changes
  useEffect(() => { setOpenCategory(null); }, [tab]);

  const title = tab === "schede" ? "Schede Tecniche" : "Modelli 2D e 3D";

  return (
    <>
      {/* ── Titolo + Tabs (stile pill pagina prodotti) ──────── */}
      <section className="pt-16 md:pt-20 pb-8" style={{ backgroundColor: "#f9f8f6" }}>
        <div className="gtv-container">
          <div className="text-center mb-8">
            <h1 className="font-sans text-[38px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
              {title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-5 justify-center">
            <button
              onClick={() => setTab("modelli")}
              className={`px-2.5 py-1 rounded-full text-[16px] font-light uppercase tracking-[0.01em] transition-all ${
                tab === "modelli" ? "bg-dark text-white" : "bg-warm-100 text-dark hover:bg-warm-200"
              }`}
            >
              Modelli 2D e 3D
            </button>
            <button
              onClick={() => setTab("schede")}
              className={`px-2.5 py-1 rounded-full text-[16px] font-light uppercase tracking-[0.01em] transition-all ${
                tab === "schede" ? "bg-dark text-white" : "bg-warm-100 text-dark hover:bg-warm-200"
              }`}
            >
              Schede Tecniche
            </button>
          </div>
        </div>
      </section>

      {/* ── Accordion per categoria ─────────────────────────── */}
      <section className="pb-16 lg:pb-24" style={{ backgroundColor: "#f9f8f6" }}>
        <div className="gtv-container pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {loading ? (
              <div className="py-20 text-center text-warm-400 text-sm">Caricamento...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-warm-400 text-sm">Nessun file disponibile.</div>
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
                                    className="flex items-center justify-between py-4 gap-4 flex-wrap"
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
                                    <div className="flex items-center gap-5 flex-shrink-0">
                                      {tab === "schede" && p.techSheetUrl && (
                                        <a
                                          href={p.techSheetUrl}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 uppercase text-[12px] tracking-[0.1em] text-black hover:text-accent transition-colors group"
                                        >
                                          Download
                                          <Download
                                            size={14}
                                            className="transition-transform group-hover:translate-y-0.5"
                                          />
                                        </a>
                                      )}
                                      {tab === "modelli" && p.model2dUrl && (
                                        <a
                                          href={p.model2dUrl}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 uppercase text-[12px] tracking-[0.1em] text-black hover:text-accent transition-colors group"
                                        >
                                          2D
                                          <Download
                                            size={14}
                                            className="transition-transform group-hover:translate-y-0.5"
                                          />
                                        </a>
                                      )}
                                      {tab === "modelli" && p.model3dUrl && (
                                        <a
                                          href={p.model3dUrl}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 uppercase text-[12px] tracking-[0.1em] text-black hover:text-accent transition-colors group"
                                        >
                                          3D
                                          <Download
                                            size={14}
                                            className="transition-transform group-hover:translate-y-0.5"
                                          />
                                        </a>
                                      )}
                                    </div>
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
          <span>{title}</span>
        </div>
      </div>
    </>
  );
}
