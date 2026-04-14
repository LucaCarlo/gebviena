"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface FieldDef {
  key: string;
  label: string;
  type: "short" | "long" | "html" | "slug";
}

export interface TranslationCtx {
  lang: string;
  defaultLang: string;
  isTranslating: boolean;       // true when lang !== defaultLang
  fields: FieldDef[];
  source: Record<string, unknown>;
  // Returns the value currently shown for this field (in the active lang)
  getValue: (key: string, defaultValue: string) => string;
  // Updates value for active lang. If active is default, calls onDefaultChange.
  setValue: (key: string, value: string, onDefaultChange?: (v: string) => void) => void;
  // Save current draft (only for non-default lang). Returns success boolean.
  saveTranslation: () => Promise<boolean>;
  // Translate a single field with AI (non-default only). Returns translated string or null.
  translateField: (key: string, htmlMode?: boolean) => Promise<string | null>;
  setLang: (l: string) => void;
}

const Ctx = createContext<TranslationCtx | null>(null);

export function useTranslationCtx(): TranslationCtx | null {
  return useContext(Ctx);
}

interface ProviderProps {
  entity: string;
  entityId?: string;
  defaultLang: string;
  initialLang: string;
  children: ReactNode;
  onToast?: (message: string, type: "success" | "error") => void;
}

export function TranslationProvider({ entity, entityId, defaultLang, initialLang, children, onToast }: ProviderProps) {
  const [lang, setLang] = useState(initialLang);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [source, setSource] = useState<Record<string, unknown>>({});
  // draft per language (only for non-default)
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

  // Load translations whenever entityId changes
  useEffect(() => {
    if (!entityId) return;
    fetch(`/api/admin/translations/${entity}/${entityId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setFields(res.fields);
          setSource(res.source || {});
          const next: Record<string, Record<string, string>> = {};
          for (const t of res.data) {
            const m: Record<string, string> = {};
            for (const f of res.fields as FieldDef[]) {
              const v = (t as Record<string, unknown>)[f.key];
              m[f.key] = typeof v === "string" ? v : "";
            }
            next[t.languageCode] = m;
          }
          setDrafts(next);
        }
      });
  }, [entity, entityId]);

  const isTranslating = lang !== defaultLang;

  const getValue = useCallback(
    (key: string, defaultValue: string): string => {
      if (!isTranslating) return defaultValue;
      const langDraft = drafts[lang];
      if (langDraft && key in langDraft) return langDraft[key];
      return ""; // empty until translated
    },
    [isTranslating, lang, drafts]
  );

  const setValue = useCallback(
    (key: string, value: string, onDefaultChange?: (v: string) => void) => {
      if (!isTranslating) {
        if (onDefaultChange) onDefaultChange(value);
        return;
      }
      setDrafts((prev) => ({
        ...prev,
        [lang]: { ...(prev[lang] || {}), [key]: value },
      }));
    },
    [isTranslating, lang]
  );

  const saveTranslation = useCallback(async (): Promise<boolean> => {
    if (!isTranslating || !entityId) return false;
    const draft = drafts[lang] || {};
    try {
      const res = await fetch(`/api/admin/translations/${entity}/${entityId}/${lang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "translated", isPublished: true }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.(`Traduzione ${lang.toUpperCase()} salvata`, "success");
        return true;
      }
      onToast?.(data.error || "Errore nel salvataggio traduzione", "error");
      return false;
    } catch {
      onToast?.("Errore di connessione", "error");
      return false;
    }
  }, [entity, entityId, lang, drafts, isTranslating, onToast]);

  const translateField = useCallback(
    async (key: string, htmlMode = false): Promise<string | null> => {
      if (!isTranslating) return null;
      const src = source[key];
      const text = typeof src === "string" ? src : "";
      if (!text.trim()) {
        onToast?.("Sorgente vuota", "error");
        return null;
      }
      try {
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, fromLang: defaultLang, toLang: lang, htmlMode }),
        });
        const data = await res.json();
        if (data.success) {
          setDrafts((prev) => ({
            ...prev,
            [lang]: { ...(prev[lang] || {}), [key]: data.translation },
          }));
          return data.translation as string;
        }
        onToast?.(data.error || "Errore traduzione", "error");
        return null;
      } catch {
        onToast?.("Errore di connessione", "error");
        return null;
      }
    },
    [isTranslating, lang, defaultLang, source, onToast]
  );

  return (
    <Ctx.Provider value={{ lang, defaultLang, isTranslating, fields, source, getValue, setValue, saveTranslation, translateField, setLang }}>
      {children}
    </Ctx.Provider>
  );
}
