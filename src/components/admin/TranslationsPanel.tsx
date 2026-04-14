"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Save, Check, AlertCircle, Globe } from "lucide-react";
import { slugify } from "@/lib/utils";

interface FieldDef {
  key: string;
  label: string;
  type: "short" | "long" | "html" | "slug";
}

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  urlPrefix: string | null;
}

interface TranslationRow {
  id: string;
  languageCode: string;
  status: string;
  isPublished: boolean;
  [k: string]: unknown;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

interface Props {
  entity: string;          // "product" | "designer" | ...
  entityId: string;
  defaultSourceLang?: string; // default "it"
}

const inputBase = "w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800";

function statusBadge(row: TranslationRow | undefined, fields: FieldDef[]) {
  if (!row) return { color: "bg-warm-200 text-warm-600", label: "Da tradurre", icon: "⚪" };
  const total = fields.length;
  let filled = 0;
  for (const f of fields) {
    const v = row[f.key];
    if (typeof v === "string" && v.trim()) filled++;
  }
  if (filled === 0) return { color: "bg-warm-200 text-warm-600", label: "Da tradurre", icon: "⚪" };
  if (filled < total) return { color: "bg-amber-100 text-amber-700", label: "Parziale", icon: "🟡" };
  return { color: "bg-green-100 text-green-700", label: "Tradotto", icon: "✅" };
}

export default function TranslationsPanel({ entity, entityId, defaultSourceLang = "it" }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [translations, setTranslations] = useState<Record<string, TranslationRow>>({});
  const [source, setSource] = useState<Record<string, unknown>>({});
  const [activeLang, setActiveLang] = useState<string>("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null); // field key being translated, or "ALL"
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load languages + translations
  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    Promise.all([
      fetch("/api/languages").then((r) => r.json()),
      fetch(`/api/admin/translations/${entity}/${entityId}`).then((r) => r.json()),
    ]).then(([langsRes, transRes]) => {
      if (langsRes.success) setLanguages(langsRes.data);
      if (transRes.success) {
        setFields(transRes.fields);
        const map: Record<string, TranslationRow> = {};
        for (const t of transRes.data) map[t.languageCode] = t;
        setTranslations(map);
        setSource(transRes.source || {});
        // Select first non-default language by default
        const first = (langsRes.data as Language[]).find((l) => !l.isDefault);
        if (first) setActiveLang(first.code);
      }
      setLoading(false);
    });
  }, [entity, entityId]);

  // When activeLang changes, fill draft from saved translation
  useEffect(() => {
    if (!activeLang) return;
    const row = translations[activeLang];
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = row?.[f.key];
      next[f.key] = typeof v === "string" ? v : "";
    }
    setDraft(next);
  }, [activeLang, translations, fields]);

  const sourceText = useCallback(
    (key: string) => {
      const v = source[key];
      return typeof v === "string" ? v : "";
    },
    [source]
  );

  const updateDraft = (key: string, value: string) => setDraft((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!activeLang) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/translations/${entity}/${entityId}/${activeLang}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "translated", isPublished: true }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslations((p) => ({ ...p, [activeLang]: data.data }));
        showToast(`Traduzione ${activeLang.toUpperCase()} salvata`, "success");
      } else {
        showToast(data.error || "Errore nel salvataggio", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSaving(false);
    }
  };

  const translateField = async (fieldKey: string) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field || !activeLang) return;
    const source = sourceText(fieldKey);
    if (!source.trim()) {
      showToast(`Niente da tradurre nel campo "${field.label}" (sorgente vuota)`, "error");
      return;
    }
    setTranslating(fieldKey);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: source,
          fromLang: defaultSourceLang,
          toLang: activeLang,
          htmlMode: field.type === "html",
        }),
      });
      const data = await res.json();
      if (data.success) {
        let value = data.translation as string;
        if (field.type === "slug") value = slugify(value);
        updateDraft(fieldKey, value);
        showToast(`"${field.label}" tradotto`, "success");
      } else {
        showToast(data.error || "Errore traduzione", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTranslating(null);
    }
  };

  const translateAll = async () => {
    if (!activeLang) return;
    const sourceFields: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "slug") continue; // slug derivato dopo
      const v = sourceText(f.key);
      if (v.trim()) sourceFields[f.key] = v;
    }
    if (Object.keys(sourceFields).length === 0) {
      showToast("Nessun campo sorgente da tradurre", "error");
      return;
    }
    setTranslating("ALL");
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: sourceFields, fromLang: defaultSourceLang, toLang: activeLang }),
      });
      const data = await res.json();
      if (data.success) {
        const next = { ...draft };
        for (const [k, v] of Object.entries(data.translations as Record<string, string>)) {
          next[k] = v;
        }
        // Auto-genera slug se presente nei fields
        const slugField = fields.find((f) => f.type === "slug");
        if (slugField) {
          const titleSrc = next.name || next.title || "";
          if (titleSrc) next[slugField.key] = slugify(titleSrc);
        }
        setDraft(next);
        showToast("Tutti i campi tradotti — ricordati di salvare", "success");
      } else {
        showToast(data.error || "Errore traduzione batch", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTranslating(null);
    }
  };

  if (!entityId) {
    return (
      <div className="bg-warm-50 border border-warm-200 rounded-xl p-6 text-sm text-warm-500">
        <Globe className="inline mr-2" size={16} />
        Salva prima la scheda in italiano: poi potrai gestire le traduzioni nelle altre lingue.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-warm-200 p-6 flex items-center gap-2 text-sm text-warm-500">
        <Loader2 className="animate-spin" size={16} /> Caricamento traduzioni…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider flex items-center gap-2">
            <Globe size={16} /> Traduzioni
          </h3>
          <p className="text-[11px] text-warm-400 mt-0.5">
            Italiano è la lingua principale (modificalo dal form sopra). Qui gestisci le traduzioni.
          </p>
        </div>
      </div>

      {/* Tabs lingue */}
      <div className="flex flex-wrap gap-2 border-b border-warm-200 pb-2">
        {languages.filter((l) => !l.isDefault).map((l) => {
          const badge = statusBadge(translations[l.code], fields);
          const isActive = activeLang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActiveLang(l.code)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-700 border-warm-300 hover:bg-warm-100"
              }`}
            >
              <span>{l.flag || "🏳"}</span>
              <span>{l.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : badge.color}`}>{badge.icon}</span>
            </button>
          );
        })}
        {languages.filter((l) => !l.isDefault).length === 0 && (
          <p className="text-xs text-warm-400">Nessuna lingua extra attiva. Aggiungine una in Impostazioni → Lingue.</p>
        )}
      </div>

      {activeLang && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-warm-500">
              Stai modificando la traduzione <strong>{activeLang.toUpperCase()}</strong>.
              I campi sorgente sono in <strong>{defaultSourceLang.toUpperCase()}</strong>.
            </p>
            <button
              type="button"
              onClick={translateAll}
              disabled={translating !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 disabled:opacity-50"
            >
              {translating === "ALL" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Traduci tutto con AI
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((f) => {
              const src = sourceText(f.key);
              const val = draft[f.key] || "";
              const isLong = f.type === "long" || f.type === "html";
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider">{f.label}</label>
                    <button
                      type="button"
                      onClick={() => translateField(f.key)}
                      disabled={translating !== null || !src.trim()}
                      title={src.trim() ? "Traduci dal sorgente con AI" : "Sorgente vuota"}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 disabled:opacity-40"
                    >
                      {translating === f.key ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Traduci
                    </button>
                  </div>
                  {src && (
                    <div className="text-[11px] text-warm-400 italic px-2 py-1 bg-warm-50 rounded border border-warm-100 line-clamp-2">
                      {defaultSourceLang.toUpperCase()}: {src.length > 200 ? src.slice(0, 200) + "…" : src}
                    </div>
                  )}
                  {isLong ? (
                    <textarea
                      value={val}
                      onChange={(e) => updateDraft(f.key, e.target.value)}
                      rows={f.type === "html" ? 6 : 3}
                      className={inputBase}
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updateDraft(f.key, e.target.value)}
                      className={inputBase}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salva traduzione {activeLang.toUpperCase()}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
