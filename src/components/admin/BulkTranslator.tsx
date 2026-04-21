"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Globe } from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
}

interface Item {
  id: string;
  label: string;
}

interface Props {
  entity: "category" | "typology" | "subcategory";
  items: Item[];
  /** Called after a successful bulk translation so the parent can refetch. */
  onDone?: () => void;
}

/**
 * Bulk-translate all items (categories/typologies/subcategories) into the
 * selected language via the AI translate endpoint, then save every
 * translation with PUT /api/admin/translations/{entity}/{id}/{lang}.
 *
 * The AI call uses the `fields` batch form, so it's a single round-trip to
 * the model instead of N single calls.
 */
export default function BulkTranslator({ entity, items, onDone }: Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [defaultCode, setDefaultCode] = useState("it");
  const [targetLang, setTargetLang] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const langs = data.data as Language[];
        setLanguages(langs);
        const def = langs.find((l) => l.isDefault);
        if (def) setDefaultCode(def.code);
        const firstNonDefault = langs.find((l) => !l.isDefault);
        if (firstNonDefault) setTargetLang(firstNonDefault.code);
      });
  }, []);

  const run = async () => {
    if (!targetLang || targetLang === defaultCode) return;
    const validItems = items.filter((it) => it.label && it.label.trim());
    if (validItems.length === 0) {
      setMsg({ type: "error", text: "Nessuna etichetta da tradurre." });
      return;
    }
    const langName = languages.find((l) => l.code === targetLang)?.name || targetLang;
    if (!confirm(`Tradurre ${validItems.length} etichette in ${langName}? Le traduzioni esistenti verranno sovrascritte.`)) return;

    setBusy(true);
    setMsg(null);
    setProgress({ done: 0, total: validItems.length });
    try {
      // 1. One AI batch call
      const fields: Record<string, string> = {};
      validItems.forEach((it) => { fields[it.id] = it.label; });
      const aiRes = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, fromLang: defaultCode, toLang: targetLang }),
      });
      const aiData = await aiRes.json();
      if (!aiData.success) throw new Error(aiData.error || "AI translate failed");
      const translations = aiData.translations as Record<string, string>;

      // 2. Persist each translation (sequentially so the progress bar is meaningful)
      let done = 0;
      for (const it of validItems) {
        const translated = translations[it.id];
        if (translated) {
          await fetch(`/api/admin/translations/${entity}/${it.id}/${targetLang}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: translated, status: "translated", isPublished: true }),
          });
        }
        done += 1;
        setProgress({ done, total: validItems.length });
      }

      setMsg({ type: "success", text: `${done} etichette tradotte in ${langName}.` });
      onDone?.();
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 1500);
    }
  };

  const nonDefault = languages.filter((l) => !l.isDefault);
  if (nonDefault.length === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
      <Globe size={14} className="text-amber-700" />
      <span className="text-amber-900 font-medium">Traduci tutte in</span>
      <select
        value={targetLang}
        onChange={(e) => setTargetLang(e.target.value)}
        disabled={busy}
        className="border border-amber-300 rounded px-2 py-1 text-sm bg-white"
      >
        {nonDefault.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag || ""} {l.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={run}
        disabled={busy || !targetLang || items.length === 0}
        className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded text-sm hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy && progress ? `${progress.done}/${progress.total}` : "Traduci tutte"}
      </button>
      {msg && (
        <span className={`text-xs ${msg.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
