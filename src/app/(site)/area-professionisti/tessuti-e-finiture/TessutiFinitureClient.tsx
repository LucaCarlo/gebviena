"use client";

import { useState } from "react";
import { Plus, Minus, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/contexts/I18nContext";

interface FabricFile {
  id: string;
  name: string;
  title: string | null;
  fileUrl: string;
}

interface FabricCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  files: FabricFile[];
}

export default function TessutiFinitureClient({ categories }: { categories: FabricCategory[] }) {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <div className="py-20 text-center text-warm-400 text-sm">
        {t("materiale-tecnico.fabrics.empty") || "Nessuna cartella disponibile."}
      </div>
    );
  }

  return (
    <div className="divide-y divide-black border-t border-b border-black">
      {categories.map((fc) => {
        const isOpen = openId === fc.id;
        return (
          <div key={fc.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : fc.id)}
              className="w-full flex items-center justify-between py-5 px-2 group"
              aria-expanded={isOpen}
            >
              <span className="uppercase text-[18px] md:text-[20px] tracking-[0.03em] text-black font-light text-left">
                {fc.name}
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
                    {fc.description && (
                      <p className="text-[14px] text-warm-600 font-light mb-4">{fc.description}</p>
                    )}
                    {fc.files.length === 0 ? (
                      <div className="py-4 text-warm-400 text-sm">
                        {t("materiale-tecnico.empty") || "Nessun file disponibile."}
                      </div>
                    ) : (
                      <div className="divide-y divide-warm-200">
                        {fc.files.map((f) => (
                          <div key={f.id} className="flex items-center justify-between py-4 gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <span className="uppercase text-[14px] tracking-[0.05em] text-black font-light">
                                {f.title || f.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-5 flex-shrink-0">
                              <a
                                href={f.fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 uppercase text-[12px] tracking-[0.1em] text-black hover:text-accent transition-colors group"
                              >
                                {t("materiale-tecnico.download.label") || "Scarica"}
                                <Download
                                  size={14}
                                  className="transition-transform group-hover:translate-y-0.5"
                                />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
