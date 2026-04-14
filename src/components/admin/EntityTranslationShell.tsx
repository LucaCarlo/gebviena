"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import TranslationEditor from "./TranslationEditor";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  urlPrefix: string | null;
}

interface Props {
  entity: string;
  entityId?: string;
  children: ReactNode;
}

export default function EntityTranslationShell({ entity, entityId, children }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [active, setActive] = useState<string>("");
  const [defaultCode, setDefaultCode] = useState<string>("it");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setLanguages(data.data);
          const def = (data.data as Language[]).find((l) => l.isDefault) || data.data[0];
          if (def) {
            setDefaultCode(def.code);
            setActive(def.code);
          }
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-warm-500 flex items-center gap-2 mb-4"><Loader2 size={14} className="animate-spin" /> Caricamento lingue…</div>;
  }

  const isDefault = active === defaultCode;

  return (
    <div className="space-y-4">
      {/* Top language switcher */}
      <div className="bg-white rounded-xl border border-warm-200 p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 uppercase tracking-wider pr-2 border-r border-warm-200">
          <Globe size={14} /> Lingua
        </div>
        {languages.map((l) => {
          const isActive = active === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(l.code)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-700 border-warm-300 hover:bg-warm-100"
              }`}
            >
              <span>{l.flag || "🏳"}</span>
              <span>{l.name}</span>
              {l.isDefault && <span className={`text-[9px] uppercase ${isActive ? "text-white/70" : "text-warm-400"}`}>principale</span>}
            </button>
          );
        })}
      </div>

      {/* Default language form (always mounted to preserve state) */}
      <div className={isDefault ? "" : "hidden"}>{children}</div>

      {/* Translation editor for non-default language */}
      {!isDefault && entityId && (
        <TranslationEditor entity={entity} entityId={entityId} lang={active} defaultLang={defaultCode} />
      )}
      {!isDefault && !entityId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
          <Globe className="inline mr-2" size={16} />
          Salva prima la scheda in <strong>{defaultCode.toUpperCase()}</strong>: poi potrai gestire le traduzioni nelle altre lingue.
        </div>
      )}
    </div>
  );
}
