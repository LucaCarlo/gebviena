"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useT, useLang } from "@/contexts/I18nContext";
import AssistanceContactModal from "./AssistanceContactModal";

/**
 * Footer dedicato allo store: snello, senza i link alle pagine del sito
 * principale. Solo contatti per assistenza + orari, bilingue IT/FR.
 * Il bottom bar (copyright + disclaimer marchio + "Built by") è identico
 * a quello del sito principale.
 */
export default function StoreFooter() {
  const t = useT();
  const isFr = useLang() === "fr";
  const [builtByLogo, setBuiltByLogo] = useState<string>("");
  const [builtByLink, setBuiltByLink] = useState<string>("");
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    fetch("/api/page-images?page=footer")
      .then((r) => r.json())
      .then((d) => {
        const items = d?.data || [];
        const logo = items.find((i: { section: string }) => i.section === "built-by-logo");
        if (logo?.imageUrl) setBuiltByLogo(logo.imageUrl);
        if (logo?.linkUrl) setBuiltByLink(logo.linkUrl);
      })
      .catch(() => {});
  }, []);

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
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="underline underline-offset-2 hover:text-warm-900 transition-colors"
              >
                {isFr ? "Écrivez-nous" : "Scrivici"}
              </button>
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
      </div>

      <AssistanceContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* Bottom bar — identico al sito principale */}
      <div className="mx-auto w-full max-w-[1420px] px-4 md:px-8 pb-12 pt-8 md:pt-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <p className="text-[14px] font-normal leading-relaxed" style={{ color: "#000" }}>
              {t("footer.bottom.copyright")}
            </p>
            <p className="text-[13px] font-normal leading-[1.4] mt-3 max-w-3xl" style={{ color: "#000" }}>
              {t("footer.bottom.disclaimer")}
            </p>
          </div>
          {builtByLogo && (
            <div className="flex items-center gap-1.5 shrink-0" style={{ color: "#000" }}>
              <span className="text-[13px] font-normal">Built by</span>
              {builtByLink ? (
                <a
                  href={builtByLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  aria-label="Built by"
                >
                  <Image
                    src={builtByLogo}
                    alt="Built by"
                    width={80}
                    height={18}
                    className="object-contain h-[18px] w-auto"
                    unoptimized
                  />
                </a>
              ) : (
                <Image
                  src={builtByLogo}
                  alt="Built by"
                  width={80}
                  height={18}
                  className="object-contain h-[18px] w-auto"
                  unoptimized
                />
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
