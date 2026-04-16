"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/contexts/I18nContext";
import { translateSegmentsBackward, translateSegmentsForward, DEFAULT_LANG } from "@/lib/path-segments";

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
    window.location.href = destination;
  };

  if (languages.length <= 1) return null;

  const label = (currentLang || "it").toUpperCase();
  const color = isScrolled ? "text-neutral-700" : "text-white";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-[14px] font-light uppercase tracking-[0.05em] transition-colors hover:opacity-70 ${color}`}
        aria-label="Cambia lingua"
      >
        <span>{label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-black/10 shadow-lg min-w-[140px] z-[80]">
          {languages.map((l) => {
            const isCurrent = l.code === currentLang;
            return (
              <button
                key={l.code}
                onClick={() => switchTo(l)}
                className={`w-full text-left px-4 py-2.5 text-[14px] uppercase tracking-[0.05em] transition-colors text-dark ${isCurrent ? "font-semibold bg-warm-50" : "font-light hover:bg-warm-50"}`}
              >
                {l.flag && <span className="mr-2">{l.flag}</span>}
                {l.code.toUpperCase()} — {l.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
