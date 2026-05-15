"use client";

import { useLang } from "@/contexts/I18nContext";

/**
 * Footer dedicato allo store: snello, senza i link alle pagine del sito
 * principale. Solo contatti per assistenza + orari, bilingue IT/FR.
 */
export default function StoreFooter() {
  const isFr = useLang() === "fr";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-warm-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <div className="text-sm font-medium tracking-[0.18em] uppercase text-warm-900">
              Gebrüder Thonet Vienna
            </div>
            <p className="text-[12px] text-warm-500 mt-2 max-w-xs leading-relaxed">
              {isFr
                ? "Boutique en ligne — vente spéciale. Design viennois livré chez vous."
                : "Shop online — vendita speciale. Design viennese, ordinabile a casa tua."}
            </p>
          </div>

          <div className="text-[13px] text-warm-700 leading-relaxed">
            <div className="text-[11px] uppercase tracking-[0.18em] text-warm-500 mb-2">
              {isFr ? "Assistance" : "Assistenza"}
            </div>
            <div>
              <a href="mailto:info@gebruederthonetvienna.com" className="hover:text-warm-900 transition-colors">
                info@gebruederthonetvienna.com
              </a>
            </div>
            <div>
              <a href="tel:+390110133330" className="hover:text-warm-900 transition-colors">
                +39 011 0133330
              </a>
            </div>
            <div className="text-warm-500 mt-1">
              {isFr ? "Lundi–Samedi 9h00–18h00" : "Lunedì–Sabato 9:00–18:00"}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-warm-100 text-[11px] text-warm-400">
          © {year} Gebrüder Thonet Vienna · Production Furniture International S.p.A
        </div>
      </div>
    </footer>
  );
}
