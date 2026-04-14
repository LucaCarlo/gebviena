"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Languages, Search, Sparkles, Loader2, RotateCcw, Check, AlertCircle } from "lucide-react";
import { UI_STRING_GROUPS } from "@/lib/ui-strings";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface Override {
  key: string;
  languageCode: string;
  value: string;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function UiTranslationsPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultCode, setDefaultCode] = useState("it");
  const [targetLang, setTargetLang] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // key -> value (for current targetLang)
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("__all");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLanguages(data.data);
          const def = (data.data as Language[]).find((l) => l.isDefault);
          if (def) setDefaultCode(def.code);
          const first = (data.data as Language[]).find((l) => !l.isDefault);
          if (first) setTargetLang(first.code);
        }
      });
    fetch("/api/admin/ui-translations")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const map: Record<string, Record<string, string>> = {};
          for (const o of data.data as Override[]) {
            if (!map[o.key]) map[o.key] = {};
            map[o.key][o.languageCode] = o.value;
          }
          setOverrides(map);
        }
      });
  }, []);

  // When targetLang changes, populate drafts from overrides
  useEffect(() => {
    if (!targetLang) return;
    const next: Record<string, string> = {};
    for (const g of UI_STRING_GROUPS) {
      for (const s of g.strings) {
        next[s.key] = overrides[s.key]?.[targetLang] || "";
      }
    }
    setDrafts(next);
  }, [targetLang, overrides]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return UI_STRING_GROUPS
      .filter((g) => activeGroup === "__all" || activeGroup === g.id)
      .map((g) => ({
        ...g,
        strings: g.strings.filter((s) => {
          if (!q) return true;
          return (
            s.key.toLowerCase().includes(q) ||
            s.defaultValue.toLowerCase().includes(q) ||
            (drafts[s.key] || "").toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.strings.length > 0);
  }, [search, activeGroup, drafts]);

  const persistOne = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/ui-translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, languageCode: targetLang, value }),
      });
      const data = await res.json();
      if (data.success) {
        setOverrides((prev) => {
          const next = { ...prev };
          if (!next[key]) next[key] = {};
          if (!value.trim()) delete next[key][targetLang];
          else next[key] = { ...next[key], [targetLang]: value };
          return next;
        });
      } else {
        showToast(data.error || "Errore", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setSavingKey(null);
    }
  };

  const handleBlur = (key: string) => {
    const value = drafts[key] || "";
    const current = overrides[key]?.[targetLang] || "";
    if (value !== current) persistOne(key, value);
  };

  const handleReset = (key: string) => {
    setDrafts((p) => ({ ...p, [key]: "" }));
    persistOne(key, "");
  };

  const translateOne = async (key: string, defaultValue: string) => {
    if (!targetLang) return;
    setTranslatingKey(key);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: defaultValue, fromLang: defaultCode, toLang: targetLang }),
      });
      const data = await res.json();
      if (data.success) {
        setDrafts((p) => ({ ...p, [key]: data.translation }));
        await persistOne(key, data.translation);
      } else {
        showToast(data.error || "Errore traduzione", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTranslatingKey(null);
    }
  };

  const translateAll = async () => {
    if (!targetLang) return;
    const toTranslate: Record<string, string> = {};
    for (const g of filteredGroups) {
      for (const s of g.strings) {
        if (!drafts[s.key] && s.defaultValue.trim()) {
          toTranslate[s.key] = s.defaultValue;
        }
      }
    }
    if (Object.keys(toTranslate).length === 0) {
      showToast("Niente da tradurre (tutti i campi visibili sono già tradotti)", "error");
      return;
    }
    setTranslatingAll(true);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: toTranslate, fromLang: defaultCode, toLang: targetLang }),
      });
      const data = await res.json();
      if (data.success) {
        const translations = data.translations as Record<string, string>;
        setDrafts((p) => ({ ...p, ...translations }));
        // Persist all
        for (const [k, v] of Object.entries(translations)) {
          await persistOne(k, v);
        }
        showToast(`${Object.keys(translations).length} stringhe tradotte e salvate`, "success");
      } else {
        showToast(data.error || "Errore traduzione batch", "error");
      }
    } catch {
      showToast("Errore di connessione", "error");
    } finally {
      setTranslatingAll(false);
    }
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-warm-800 flex items-center gap-2">
          <Languages size={22} /> Traduzioni del sito
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Modifica i testi fissi del sito (menu, bottoni, etichette form). Le righe vuote useranno il valore predefinito in italiano.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-warm-200 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Lingua</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
          >
            {languages.filter((l) => !l.isDefault).map((l) => (
              <option key={l.code} value={l.code}>{l.flag || ""} {l.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Sezione</span>
          <select
            value={activeGroup}
            onChange={(e) => setActiveGroup(e.target.value)}
            className="border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
          >
            <option value="__all">Tutte</option>
            {UI_STRING_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 relative min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per chiave o testo…"
            className="w-full border border-warm-300 rounded pl-9 pr-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
          />
        </div>

        <button
          onClick={translateAll}
          disabled={translatingAll || !targetLang}
          className="flex items-center gap-2 bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-200 disabled:opacity-50"
        >
          {translatingAll ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Traduci tutto con AI
        </button>
      </div>

      {filteredGroups.map((g) => (
        <div key={g.id} className="mb-6">
          <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider mb-2">{g.label}</h2>
          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 border-b border-warm-200">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase w-1/4">Chiave</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase w-1/3">Italiano (default)</th>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase w-1/3">{targetLang.toUpperCase()}</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {g.strings.map((s) => {
                  const hasOverride = !!(overrides[s.key]?.[targetLang]);
                  return (
                    <tr key={s.key} className="hover:bg-warm-50">
                      <td className="px-4 py-2 align-top">
                        <code className="text-[11px] text-warm-500">{s.key}</code>
                      </td>
                      <td className="px-4 py-2 align-top text-warm-700 whitespace-pre-wrap">{s.defaultValue}</td>
                      <td className="px-4 py-2 align-top">
                        {(() => {
                          const isLong = s.defaultValue.length > 80 || s.defaultValue.includes("\n");
                          const rows = isLong ? Math.max(2, Math.ceil(s.defaultValue.length / 80)) : 1;
                          return isLong ? (
                            <textarea
                              value={drafts[s.key] || ""}
                              onChange={(e) => setDrafts((p) => ({ ...p, [s.key]: e.target.value }))}
                              onBlur={() => handleBlur(s.key)}
                              placeholder={hasOverride ? "" : "(usa default)"}
                              rows={rows}
                              className={`w-full border rounded px-2 py-1 text-sm focus:outline-none resize-y ${
                                hasOverride ? "border-green-300 bg-green-50" : "border-warm-300"
                              }`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={drafts[s.key] || ""}
                              onChange={(e) => setDrafts((p) => ({ ...p, [s.key]: e.target.value }))}
                              onBlur={() => handleBlur(s.key)}
                              placeholder={hasOverride ? "" : "(usa default)"}
                              className={`w-full border rounded px-2 py-1 text-sm focus:outline-none ${
                                hasOverride ? "border-green-300 bg-green-50" : "border-warm-300"
                              }`}
                            />
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => translateOne(s.key, s.defaultValue)}
                            disabled={translatingKey === s.key || translatingAll}
                            title="Traduci con AI"
                            className="p-1 text-amber-700 hover:text-amber-900 disabled:opacity-30"
                          >
                            {translatingKey === s.key ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReset(s.key)}
                            disabled={!hasOverride}
                            title="Ripristina default"
                            className="p-1 text-warm-400 hover:text-warm-700 disabled:opacity-30"
                          >
                            <RotateCcw size={12} />
                          </button>
                          {savingKey === s.key && <Loader2 size={12} className="animate-spin text-warm-400" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 text-warm-400">Nessuna stringa trovata.</div>
      )}
    </div>
  );
}
