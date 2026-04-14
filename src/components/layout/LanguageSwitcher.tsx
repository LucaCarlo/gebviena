"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = useLang();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLanguages(data.data);
      });
  }, []);

  // Close on outside click
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
    // Step 1: drop current lang prefix and convert segments back to IT canonical
    if (segments[0] && knownPrefixes.includes(segments[0])) {
      const currentPrefix = segments[0];
      segments = translateSegmentsBackward(segments.slice(1), currentPrefix);
    }
    // Step 2: forward-translate to target lang
    const target = lang.isDefault ? DEFAULT_LANG : (lang.urlPrefix || lang.code);
    const translated = translateSegmentsForward(segments, target);
    const path = translated.length ? "/" + translated.join("/") : "/";
    if (lang.isDefault) {
      router.push(path);
    } else {
      router.push(`/${target}${path === "/" ? "" : path}`);
    }
  };

  const current = languages.find((l) => l.code === currentLang);
  const currentName = current?.name || (currentLang === "it" ? "Italiano" : currentLang.toUpperCase());

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-between border border-black px-5 py-3 text-[16px] cursor-pointer hover:underline min-w-[180px]"
        style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}
      >
        <span>{currentName}</span>
        <svg className={`ml-6 w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-black z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => switchTo(l)}
              className={`w-full text-left px-5 py-3 text-[16px] hover:underline transition-all ${l.code === currentLang ? "font-semibold" : ""}`}
              style={{ color: "#000", textUnderlineOffset: "4px", textDecorationThickness: "0.5px" }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
