"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/contexts/I18nContext";
import { translateSegmentsBackward, translateSegmentsForward, DEFAULT_LANG } from "@/lib/path-segments";

// Language names displayed in a given UI language
const LANG_NAMES: Record<string, Record<string, string>> = {
  it: { it: "Italiano", en: "Inglese", de: "Tedesco", fr: "Francese" },
  en: { it: "Italian", en: "English", de: "German", fr: "French" },
  de: { it: "Italienisch", en: "Englisch", de: "Deutsch", fr: "Französisch" },
  fr: { it: "Italien", en: "Anglais", de: "Allemand", fr: "Français" },
};

function localizedName(code: string, uiLang: string, fallback: string): string {
  return LANG_NAMES[uiLang]?.[code] || fallback;
}

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  urlPrefix: string | null;
}

interface Props {
  isScrolled: boolean;
}

export default function HeaderLanguageSwitcher({ isScrolled }: Props) {
  const pathname = usePathname();
  const currentLang = useLang();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLanguages(data.data.filter((l: Language) => l.isActive));
      });
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
    const knownPrefixes = languages.filter((l) => !l.isDefault && l.urlPrefix).map((l) => l.urlPrefix);
    let segments = pathname.split("/").filter(Boolean);
    if (segments[0] && knownPrefixes.includes(segments[0])) {
      const currentPrefix = segments[0];
      segments = translateSegmentsBackward(segments.slice(1), currentPrefix);
    }
    const target = lang.isDefault ? DEFAULT_LANG : (lang.urlPrefix || lang.code);
    const translated = translateSegmentsForward(segments, target);
    const path = translated.length ? "/" + translated.join("/") : "/";
    const destination = lang.isDefault ? path : `/${target}${path === "/" ? "" : path}`;
    // Persist preference so hardcoded Italian links keep redirecting to EN
    document.cookie = `gtv_lang=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.href = destination;
  };

  if (languages.length <= 1) return null;

  const shortLabel = (currentLang || "it").toUpperCase();
  const colorClass = isScrolled ? "!text-black" : "text-white";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 uppercase text-[16px] tracking-[0.03em] font-medium transition-colors hover:underline ${colorClass}`}
        style={{ marginTop: "2px", textUnderlineOffset: "6px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
        aria-label="Cambia lingua"
      >
        <span>{shortLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-3 bg-white border border-black min-w-[180px] z-[80]">
          {languages.map((l) => {
            const isCurrent = l.code === currentLang;
            return (
              <button
                key={l.code}
                onClick={() => switchTo(l)}
                className={`block w-full text-left px-5 py-3 text-[16px] uppercase tracking-[0.03em] transition-all hover:underline ${isCurrent ? "font-semibold" : "font-normal"}`}
                style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}
              >
                {localizedName(l.code, currentLang, l.name)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
