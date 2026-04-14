"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Globe } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
}

interface Props {
  entity: "category" | "typology" | "subcategory";
  entityId: string | null; // null when creating a new entity (no translations yet)
  defaultLabel: string;     // current IT label being edited
  onDefaultLabelChange: (v: string) => void;
  className?: string;
}

/**
 * Inline language switcher + label input for taxonomy entities.
 * Shows a small dropdown above the label input. When a non-default lang is selected,
 * the input edits and saves the translation directly via API.
 */
export default function InlineLabelTranslator({ entity, entityId, defaultLabel, onDefaultLabelChange, className }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultCode, setDefaultCode] = useState("it");
  const [activeLang, setActiveLang] = useState("it");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Load languages
  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLanguages(data.data);
          const def = (data.data as Language[]).find((l) => l.isDefault);
          if (def) {
            setDefaultCode(def.code);
            setActiveLang(def.code);
          }
        }
      });
  }, []);

  // Load translations for this entity
  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/admin/translations/${entity}/${entityId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const map: Record<string, string> = {};
          for (const t of res.data) {
            map[t.languageCode] = t.label || "";
          }
          setTranslations(map);
        }
      });
  }, [entity, entityId]);

  const isDefault = activeLang === defaultCode;
  const value = isDefault ? defaultLabel : (translations[activeLang] ?? "");

  const handleChange = (v: string) => {
    if (isDefault) onDefaultLabelChange(v);
    else setTranslations((p) => ({ ...p, [activeLang]: v }));
  };

  const saveTranslation = async () => {
    if (isDefault || !entityId) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/translations/${entity}/${entityId}/${activeLang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: translations[activeLang] || "", status: "translated", isPublished: true }),
      });
    } finally {
      setBusy(false);
    }
  };

  const translateAI = async () => {
    if (isDefault || !defaultLabel.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: defaultLabel, fromLang: defaultCode, toLang: activeLang }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslations((p) => ({ ...p, [activeLang]: data.translation }));
      }
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1 mb-1">
        <Globe size={10} className="text-warm-400" />
        <select
          value={activeLang}
          onChange={(e) => setActiveLang(e.target.value)}
          className="text-[10px] border border-warm-200 rounded px-1 py-0.5 bg-white"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag || ""} {l.name}{l.isDefault ? " (princ.)" : ""}
            </option>
          ))}
        </select>
        {!isDefault && (
          <>
            <button
              type="button"
              onClick={translateAI}
              disabled={translating || !defaultLabel.trim() || !entityId}
              title={entityId ? "Traduci dall'italiano con AI" : "Salva prima la versione IT"}
              className="text-[10px] text-amber-700 hover:text-amber-900 disabled:opacity-30 px-1"
            >
              {translating ? <Loader2 size={10} className="animate-spin inline" /> : <Sparkles size={10} className="inline" />}
            </button>
            <button
              type="button"
              onClick={saveTranslation}
              disabled={busy || !entityId}
              className="text-[10px] text-warm-600 hover:text-warm-800 disabled:opacity-30 px-1 underline"
            >
              {busy ? "..." : "salva"}
            </button>
          </>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-warm-300 rounded px-2 py-1 text-sm w-full"
      />
    </div>
  );
}
