"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLang } from "@/contexts/I18nContext";

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

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLanguages(data.data);
      });
  }, []);

  const switchTo = (lang: Language) => {
    setOpen(false);
    // Strip current lang prefix from path if present
    const knownPrefixes = languages.filter((l) => !l.isDefault && l.urlPrefix).map((l) => l.urlPrefix);
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] && knownPrefixes.includes(segments[0])) segments.shift();
    const basePath = "/" + segments.join("/");
    if (lang.isDefault) {
      router.push(basePath || "/");
    } else {
      router.push(`/${lang.urlPrefix}${basePath === "/" ? "" : basePath}` || "/");
    }
  };

  const current = languages.find((l) => l.code === currentLang);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm hover:opacity-70"
      >
        <Globe size={14} />
        <span>{current?.flag || ""} {current?.name || currentLang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-warm-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => switchTo(l)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-warm-50 ${l.code === currentLang ? "font-semibold" : ""}`}
            >
              {l.flag || ""} {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
