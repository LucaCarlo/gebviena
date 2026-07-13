"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Minus, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductRow {
  id: string;
  name: string;
  designerName: string;
  techSheetUrl: string | null;
  model2dUrl: string | null;
  model3dUrl: string | null;
  instructionsUrl: string | null;
  careUrl: string | null;
  category: string | null;
}

type Tab = "schede-cad" | "istruzioni" | "manutenzione";

interface I18n {
  tabSchedeCad: string;
  tabInstructions: string;
  tabCare: string;
  loading: string;
  empty: string;
  sheet: string;
  downloadPdf: string;
  typology: Record<string, string>;
}

// Tipologie canoniche, in ordine di priorità (la prima vince se un prodotto
// ne ha più di una). "CLASSICI" è una linea di prodotto (non una tipologia):
// viene ignorata. "verniciature-custom" / vuoto / valori sconosciuti → "ALTRO".
const CANONICAL = ["SEDUTE", "IMBOTTITI", "COMPLEMENTI", "TAVOLI", "OUTDOOR"];
const ALIASES: Record<string, string> = { "SEDIE": "SEDUTE" };

function extractCategory(raw: string | null): string {
  if (!raw) return "ALTRO";
  const parts = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  let bestIdx = -1;
  let best: string | null = null;
  for (const p of parts) {
    const norm = ALIASES[p] || p;
    const idx = CANONICAL.indexOf(norm);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
      best = norm;
    }
  }
  return best || "ALTRO";
}

export default function InformazioniTecnicheClient({ initialProducts, i18n }: { initialProducts: ProductRow[]; i18n: I18n }) {
  const [tab, setTab] = useState<Tab>("schede-cad");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Reset accordion on tab change
  useEffect(() => { setOpenCategory(null); }, [tab]);

  const filtered = useMemo(() => {
    if (tab === "schede-cad") {
      return initialProducts.filter(
        (p) => p.techSheetUrl?.trim() || p.model2dUrl?.trim() || p.model3dUrl?.trim(),
      );
    }
    if (tab === "istruzioni") return initialProducts.filter((p) => p.instructionsUrl?.trim());
    return initialProducts.filter((p) => p.careUrl?.trim());
  }, [initialProducts, tab]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const p of filtered) {
      const cat = extractCategory(p.category);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  const categories = useMemo(() => [
    ...CANONICAL.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CANONICAL.includes(c)),
  ], [grouped]);

  const TAB_LABEL: Record<Tab, string> = {
    "schede-cad": i18n.tabSchedeCad,
    "istruzioni": i18n.tabInstructions,
    "manutenzione": i18n.tabCare,
  };

  return (
    <>
      <div className="flex items-center gap-6 flex-wrap border-b border-warm-200 mb-8">
        {(Object.keys(TAB_LABEL) as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`pb-2 -mb-px text-[11px] uppercase tracking-[0.18em] transition-colors ${
              tab === k ? "text-warm-900 border-b-2 border-warm-900" : "text-warm-500 hover:text-warm-900"
            }`}
          >
            {TAB_LABEL[k]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-warm-400 text-sm">{i18n.empty}</div>
      ) : (
        <div className="divide-y divide-black border-t border-b border-black">
          {categories.map((cat) => {
            const items = grouped.get(cat) || [];
            const isOpen = openCategory === cat;
            return (
              <div key={cat}>
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : cat)}
                  className="w-full flex items-center justify-between py-5 px-2 group"
                >
                  <span className="uppercase text-[18px] md:text-[20px] tracking-[0.03em] text-black font-light">
                    {i18n.typology[cat] || cat} <span className="text-warm-500 text-[14px] ml-2">({items.length})</span>
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
                            <div key={p.id} className="flex items-center justify-between py-4 gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <span className="uppercase text-[14px] tracking-[0.05em] text-black font-light">{p.name}</span>
                                {p.designerName && (
                                  <span className="text-[12px] text-warm-500 ml-3">{p.designerName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 md:gap-5 flex-shrink-0 flex-wrap justify-end">
                                {tab === "schede-cad" && (
                                  <>
                                    <DownloadLink href={p.techSheetUrl} label={i18n.sheet} />
                                    <DownloadLink href={p.model2dUrl} label="2D" />
                                    <DownloadLink href={p.model3dUrl} label="3D" />
                                  </>
                                )}
                                {tab === "istruzioni" && <DownloadLink href={p.instructionsUrl} label={i18n.downloadPdf} />}
                                {tab === "manutenzione" && <DownloadLink href={p.careUrl} label={i18n.downloadPdf} />}
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
    </>
  );
}

function DownloadLink({ href, label }: { href: string | null; label: string }) {
  if (!href || !href.trim()) {
    return <span className="inline-flex items-center gap-1.5 uppercase text-[11px] tracking-[0.1em] text-warm-300 cursor-not-allowed">{label}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 uppercase text-[11px] tracking-[0.1em] text-black hover:text-warm-700 transition-colors group"
    >
      {label}
      <Download size={12} className="transition-transform group-hover:translate-y-0.5" />
    </a>
  );
}
