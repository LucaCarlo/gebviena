"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Sparkles, Check, AlertCircle, Wand2 } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

type FieldType = "short" | "long" | "html" | "slug";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  optional?: boolean;
  helpText?: string;
}

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface Props {
  /** Entity key registrato in translation-entities.ts (es. "store-product"). */
  entity: string;
  /** ID del record parent (es. storeProduct.id). */
  entityId: string;
  /** Definizione campi — se vuota, vengono caricati da server. */
  fields?: FieldDef[];
  /** Callback chiamato dopo ogni save riuscito (per refresh parent). */
  onSaved?: () => void;
}

type DraftMap = Record<string, Record<string, string>>;

export default function StoreTranslationsPanel({ entity, entityId, fields: fieldsProp, onSaved }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [activeLang, setActiveLang] = useState("it");
  const [defaultLang, setDefaultLang] = useState("it");
  const [fields, setFields] = useState<FieldDef[]>(fieldsProp ?? []);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [source, setSource] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Load languages + translations
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [langRes, transRes] = await Promise.all([
      fetch("/api/languages").then((r) => r.json()),
      fetch(`/api/admin/translations/${entity}/${entityId}`).then((r) => r.json()),
    ]);

    if (langRes.success) {
      setLanguages(langRes.data);
      const def = (langRes.data as Language[]).find((l) => l.isDefault) || langRes.data[0];
      if (def) {
        setDefaultLang(def.code);
      }
    }

    if (transRes.success) {
      // Use fields from API response unless explicit prop overrides
      if (!fieldsProp && Array.isArray(transRes.fields)) setFields(transRes.fields);

      const srcRaw = transRes.source || {};
      const srcClean: Record<string, string> = {};
      for (const k of Object.keys(srcRaw)) {
        const v = srcRaw[k];
        if (typeof v === "string") srcClean[k] = v;
      }
      setSource(srcClean);

      const next: DraftMap = {};
      for (const t of transRes.data || []) {
        const m: Record<string, string> = {};
        for (const f of transRes.fields as FieldDef[]) {
          const v = (t as Record<string, unknown>)[f.key];
          m[f.key] = typeof v === "string" ? v : "";
        }
        next[t.languageCode] = m;
      }
      setDrafts(next);
    }

    setLoading(false);
  }, [entity, entityId, fieldsProp]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getValue = (key: string) => drafts[activeLang]?.[key] ?? "";

  const setValue = (key: string, value: string) => {
    setDirty(true);
    setDrafts((prev) => ({
      ...prev,
      [activeLang]: { ...(prev[activeLang] || {}), [key]: value },
    }));
  };

  const translateOne = async (field: FieldDef) => {
    // Source = translation IT di quel campo
    const srcText = source[field.key] || drafts[defaultLang]?.[field.key] || "";
    if (!srcText.trim()) {
      showToast(`Campo "${field.label}" vuoto in ${defaultLang.toUpperCase()} — compila prima il source`, false);
      return;
    }
    setTranslatingField(field.key);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: srcText,
          fromLang: defaultLang,
          toLang: activeLang,
          htmlMode: field.type === "html",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setValue(field.key, data.translation);
      } else {
        showToast(data.error || "Errore traduzione", false);
      }
    } catch {
      showToast("Errore di connessione", false);
    } finally {
      setTranslatingField(null);
    }
  };

  const translateAll = async () => {
    setTranslatingAll(true);
    try {
      for (const f of fields) {
        if (f.type === "slug") continue; // slug non si traduce con AI
        const srcText = source[f.key] || drafts[defaultLang]?.[f.key] || "";
        if (!srcText.trim()) continue;
        const existing = drafts[activeLang]?.[f.key] || "";
        if (existing.trim()) continue; // salta campi già compilati
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: srcText,
            fromLang: defaultLang,
            toLang: activeLang,
            htmlMode: f.type === "html",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setDrafts((prev) => ({
            ...prev,
            [activeLang]: { ...(prev[activeLang] || {}), [f.key]: data.translation },
          }));
          setDirty(true);
        }
      }
      showToast(`Traduzione ${activeLang.toUpperCase()} completata`, true);
    } catch {
      showToast("Errore durante traduzione", false);
    } finally {
      setTranslatingAll(false);
    }
  };

  const saveActive = async () => {
    const payload = drafts[activeLang] || {};
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/translations/${entity}/${entityId}/${activeLang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, status: "translated", isPublished: true }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Traduzione ${activeLang.toUpperCase()} salvata`, true);
        setDirty(false);
        onSaved?.();
        // Ricarica source se attivo era default (IT)
        if (activeLang === defaultLang) await fetchAll();
      } else {
        showToast(data.error || "Errore salvataggio", false);
      }
    } catch {
      showToast("Errore di connessione", false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-warm-400 py-8">
        <Loader2 size={14} className="animate-spin" /> Caricamento traduzioni…
      </div>
    );
  }

  if (fields.length === 0) {
    return <div className="text-sm text-warm-500 italic">Nessun campo tradotto per questa entità.</div>;
  }

  const isDefault = activeLang === defaultLang;

  return (
    <div className="space-y-4">
      {/* Header: lang picker + actions */}
      <div className="bg-white rounded-lg border border-warm-200 p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-warm-600 uppercase tracking-wider">
          <Globe size={14} /> Lingua
        </div>
        <select
          value={activeLang}
          onChange={(e) => {
            if (dirty && !confirm("Hai modifiche non salvate. Cambiare lingua perdendole?")) return;
            setActiveLang(e.target.value);
            setDirty(false);
          }}
          className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag ? `${l.flag} ` : ""}{l.name}{l.isDefault ? " (principale)" : ""}
            </option>
          ))}
        </select>

        {!isDefault && (
          <button
            type="button"
            onClick={translateAll}
            disabled={translatingAll}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded hover:bg-amber-100 disabled:opacity-50"
            title="Traduce con AI tutti i campi vuoti dalla lingua principale"
          >
            {translatingAll ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            Traduci tutto con AI
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-700">• Modifiche non salvate</span>}
          <button
            type="button"
            onClick={saveActive}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-warm-900 text-white rounded text-sm hover:bg-warm-800 disabled:opacity-40"
          >
            {saving ? "Salvo…" : `Salva ${activeLang.toUpperCase()}`}
          </button>
        </div>
      </div>

      {!isDefault && Object.keys(drafts[defaultLang] || {}).length === 0 && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">
          ⚠ La versione {defaultLang.toUpperCase()} non è ancora stata salvata. Imposta prima i testi in {defaultLang.toUpperCase()} per poter tradurre.
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="bg-white rounded-lg border border-warm-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="text-xs font-medium text-warm-700">
                {f.label}
                {f.type === "slug" && <span className="ml-2 text-warm-400 font-normal">(URL)</span>}
              </label>
              {!isDefault && f.type !== "slug" && (
                <button
                  type="button"
                  onClick={() => translateOne(f)}
                  disabled={translatingField === f.key}
                  title={`Traduci da ${defaultLang.toUpperCase()} con AI`}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded disabled:opacity-50"
                >
                  {translatingField === f.key ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  AI
                </button>
              )}
            </div>
            {renderFieldEditor(f, getValue(f.key), (v) => setValue(f.key, v))}
            {f.helpText && <div className="text-xs text-warm-500 mt-1">{f.helpText}</div>}
            {!isDefault && source[f.key] && (
              <details className="mt-2 text-xs text-warm-500">
                <summary className="cursor-pointer hover:text-warm-800">Vedi sorgente {defaultLang.toUpperCase()}</summary>
                <div className="mt-1 p-2 bg-warm-50 rounded text-warm-700 font-mono whitespace-pre-wrap">{source[f.key]}</div>
              </details>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
          toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function renderFieldEditor(f: FieldDef, value: string, onChange: (v: string) => void) {
  if (f.type === "html") {
    return <RichTextEditor value={value} onChange={onChange} />;
  }
  if (f.type === "long") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-warm-200 rounded text-sm"
      />
    );
  }
  if (f.type === "slug") {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
        className="w-full px-3 py-2 border border-warm-200 rounded text-sm font-mono"
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-warm-200 rounded text-sm"
    />
  );
}
