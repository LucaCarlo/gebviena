"use client";

import { useEffect, useState, useRef } from "react";
import { useLang } from "@/contexts/I18nContext";
import { switchStoreLang } from "@/lib/store-lang-switch";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  urlPrefix: string | null;
}

/**
 * Switcher lingua per le pagine /store/*. Diversamente dal sito principale, le
 * route dello store NON sono prefissate con la lingua (es. /store/prodotti/...
 * vale per ogni lingua). La lingua corrente è risolta server-side da
 * `getCurrentLang()` (cookie `gtv_lang`), così basta scrivere il cookie e
 * ricaricare per applicare.
 */
export default function StoreLanguageSwitcher() {
  const currentLang = useLang();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLanguages(data.data.filter((l: Language) => l.isActive && ["it", "fr"].includes(l.code)));
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const switchTo = (lang: Language) => {
    setOpen(false);
    switchStoreLang(lang.code);
  };

  if (languages.length <= 1) return null;

  const shortLabel = (currentLang || "it").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 uppercase text-[11px] tracking-[0.15em] font-medium text-neutral-700 hover:text-neutral-900 transition-colors px-1 py-1"
        aria-label="Cambia lingua"
      >
        <span>{shortLabel}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-neutral-200 shadow-sm min-w-[80px] z-[80]">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => switchTo(l)}
              className={`block w-full text-left px-3 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-neutral-50 ${
                l.code === currentLang ? "bg-neutral-100 text-neutral-900 font-medium" : "text-neutral-600"
              }`}
            >
              {l.flag ? `${l.flag} ` : ""}{l.code.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
