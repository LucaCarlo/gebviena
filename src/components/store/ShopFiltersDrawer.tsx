"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import ShopFilters from "@/components/store/ShopFilters";
import { useStoreT } from "@/lib/use-store-t";

/**
 * Wrapper responsive per ShopFilters:
 * - Desktop (lg+): sidebar sempre visibile a sinistra
 * - Mobile/tablet: nascosto di default; bottone "Filtri" sticky in alto + drawer
 *   fullscreen che si apre da destra al click.
 *
 * I prodotti restano sempre visibili sotto al bottone, niente filtri che mangiano
 * la viewport iniziale.
 */
export default function ShopFiltersDrawer() {
  const t = useStoreT();
  const [open, setOpen] = useState(false);

  // Blocca scroll della pagina quando il drawer è aperto
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // ESC per chiudere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop: sidebar tradizionale */}
      <aside className="hidden lg:block">
        <ShopFilters />
      </aside>

      {/* Mobile: bottone "Filtri" + drawer */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-warm-300 text-warm-900 text-[12px] uppercase tracking-[0.18em] bg-white hover:bg-warm-50"
        >
          <SlidersHorizontal size={14} />
          {t("Filtri", "Filtres")}
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[80] bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer da destra */}
            <div className="fixed top-0 right-0 bottom-0 z-[81] w-[88vw] max-w-sm bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 shrink-0">
                <span className="text-[12px] uppercase tracking-[0.22em] text-warm-700 font-medium inline-flex items-center gap-2">
                  <SlidersHorizontal size={14} />
                  {t("Filtri", "Filtres")}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 text-warm-700 hover:text-warm-900"
                  aria-label={t("Chiudi", "Fermer")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <ShopFilters />
              </div>
              <div className="px-5 py-3 border-t border-warm-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full py-3 bg-warm-900 text-white uppercase text-[12px] tracking-[0.18em] hover:bg-warm-800"
                >
                  {t("Vedi prodotti", "Voir les produits")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
