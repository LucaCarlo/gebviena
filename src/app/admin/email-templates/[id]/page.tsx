"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Eye, Loader2, Globe, Copy, Trash2 } from "lucide-react";
import EmailBlockEditor, { type EmailBlock } from "@/components/admin/email-template/EmailBlockEditor";

const VARIABLES = ["{{firstName}}", "{{lastName}}", "{{email}}", "{{eventLink}}"];

// Lingue gestite. IT è il template base (EmailTemplate.subject/blocks);
// FR/EN/DE/ES sono override (EmailTemplateTranslation).
const LANGS = [
  { code: "it", label: "Italiano",  flag: "🇮🇹" },
  { code: "fr", label: "Français",  flag: "🇫🇷" },
  { code: "en", label: "English",   flag: "🇬🇧" },
  { code: "de", label: "Deutsch",   flag: "🇩🇪" },
  { code: "es", label: "Español",   flag: "🇪🇸" },
];

function cleanBlocks(blocks: EmailBlock[]) {
  const clean: Record<string, unknown>[] = [];
  for (const b of blocks) {
    const entry: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(b)) { if (k !== "id") entry[k] = v; }
    clean.push(entry);
  }
  return clean;
}

let blockCounter = 0;
function newId() { return `blk_${++blockCounter}_${Date.now()}`; }

function withIds(blocks: EmailBlock[]): EmailBlock[] {
  return blocks.map((b) => ({ ...b, id: b.id || newId() }));
}

interface TemplateBase { name: string; subject: string; blocks: string }
interface TemplateTranslation { languageCode: string; subject: string; blocks: string }

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Dati base IT (sempre presenti)
  const [name, setName] = useState("");
  const [itSubject, setItSubject] = useState("");
  const [itBlocks, setItBlocks] = useState<EmailBlock[]>([]);

  // Traduzioni caricate (mappa codice → dati). Non-presente = nessuna traduzione.
  const [translations, setTranslations] = useState<Record<string, { subject: string; blocks: EmailBlock[] }>>({});

  // Lingua attualmente in modifica
  const [currentLang, setCurrentLang] = useState("it");

  // Stato form (subject + blocks della lingua attiva)
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // Carica template base + traduzioni
  useEffect(() => {
    Promise.all([
      fetch(`/api/email-templates/${id}`).then((r) => r.json()),
      fetch(`/api/email-templates/${id}/translations`).then((r) => r.json()),
    ]).then(([baseRes, trRes]) => {
      if (baseRes.success && baseRes.data) {
        const b: TemplateBase = baseRes.data;
        setName(b.name);
        setItSubject(b.subject);
        let itB: EmailBlock[] = [];
        try { itB = withIds(JSON.parse(b.blocks)); } catch { /* */ }
        setItBlocks(itB);
        // di default mostra IT
        setSubject(b.subject);
        setBlocks(itB);
      }
      if (trRes.success && Array.isArray(trRes.data)) {
        const map: Record<string, { subject: string; blocks: EmailBlock[] }> = {};
        for (const t of trRes.data as TemplateTranslation[]) {
          let parsed: EmailBlock[] = [];
          try { parsed = withIds(JSON.parse(t.blocks)); } catch { /* */ }
          map[t.languageCode] = { subject: t.subject, blocks: parsed };
        }
        setTranslations(map);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  // Commit della lingua attiva al cache locale (per non perderla quando cambio lingua)
  const commitCurrentToCache = useCallback(() => {
    if (currentLang === "it") {
      setItSubject(subject);
      setItBlocks(blocks);
    } else {
      setTranslations((m) => ({ ...m, [currentLang]: { subject, blocks } }));
    }
  }, [currentLang, subject, blocks]);

  const switchLang = (newLang: string) => {
    if (newLang === currentLang) return;
    if (dirty && !confirm("Hai modifiche non salvate per questa lingua. Le perderai cambiando lingua. Continuare?")) return;
    commitCurrentToCache();
    setDirty(false);
    setCurrentLang(newLang);
    if (newLang === "it") {
      setSubject(itSubject);
      setBlocks(itBlocks);
    } else {
      const tr = translations[newLang];
      if (tr) {
        setSubject(tr.subject);
        setBlocks(tr.blocks);
      } else {
        setSubject("");
        setBlocks([]);
      }
    }
  };

  const cloneFromIt = () => {
    if (!confirm(`Vuoi copiare il contenuto italiano nella lingua ${currentLang.toUpperCase()}? Sovrascriverà quanto presente.`)) return;
    // Re-id dei blocchi per evitare collisioni in cache
    const cloned = withIds(JSON.parse(JSON.stringify(itBlocks.map((b) => { const c = { ...b } as EmailBlock; delete (c as Record<string, unknown>).id; return c; }))));
    setSubject(itSubject);
    setBlocks(cloned);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { alert("Inserisci un nome per il template"); return; }
    if (!subject.trim()) { alert("L'oggetto email è obbligatorio"); return; }
    setSaving(true);
    try {
      let res: Response;
      if (currentLang === "it") {
        // Salva sul template base (e propaga il name se l'admin l'ha cambiato).
        res = await fetch(`/api/email-templates/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, blocks: cleanBlocks(blocks) }),
        });
      } else {
        // Salva la traduzione separata.
        res = await fetch(`/api/email-templates/${id}/translations/${currentLang}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, blocks: cleanBlocks(blocks) }),
        });
      }
      const data = await res.json();
      if (!data.success) { alert(data.error || "Errore"); return; }
      // Aggiorna anche cache locale
      commitCurrentToCache();
      setDirty(false);
    } catch { alert("Errore di connessione"); }
    finally { setSaving(false); }
  };

  const handleDeleteTranslation = async () => {
    if (currentLang === "it") return;
    if (!confirm(`Eliminare la traduzione ${currentLang.toUpperCase()}? Il template per quella lingua tornerà a usare il testo italiano (template base).`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${id}/translations/${currentLang}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { alert(data.error || "Errore"); return; }
      // Rimuove dalla cache + reset form per quella lingua
      setTranslations((m) => { const n = { ...m }; delete n[currentLang]; return n; });
      setSubject("");
      setBlocks([]);
      setDirty(false);
    } catch { alert("Errore di connessione"); }
    finally { setSaving(false); }
  };

  const handlePreview = async () => {
    try {
      const res = await fetch("/api/email-templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: cleanBlocks(blocks) }),
      });
      const data = await res.json();
      if (data.success) { setPreviewHtml(data.html); setShowPreview(true); }
    } catch { /* */ }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>;
  }

  const hasTranslation = currentLang !== "it" && translations[currentLang];

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/email-templates")} className="text-warm-400 hover:text-warm-600 transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-warm-900">Modifica Template</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
            <Eye size={14} /> Anteprima
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvataggio..." : `Salva ${currentLang.toUpperCase()}`}
          </button>
        </div>
      </div>

      {/* Selettore lingua */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-warm-600 mb-3">
          <Globe size={13} />
          <span className="font-semibold uppercase tracking-wider">Lingua in modifica</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {LANGS.map((l) => {
            const active = currentLang === l.code;
            const hasTrans = l.code === "it" || translations[l.code];
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => switchLang(l.code)}
                title={l.code === "it" ? "Template base" : hasTrans ? `Traduzione esistente` : "Nessuna traduzione (usa testo IT)"}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border transition-colors ${
                  active
                    ? "bg-warm-800 text-white border-warm-800"
                    : hasTrans
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-warm-50 text-warm-500 border-warm-200 hover:bg-warm-100"
                }`}
              >
                <span>{l.flag}</span>
                <span className="font-mono text-[11px] uppercase">{l.code}</span>
                <span className="text-[11px]">{l.label}</span>
                {l.code !== "it" && hasTrans && <span className="text-[9px] uppercase tracking-wider opacity-70">✓</span>}
              </button>
            );
          })}
        </div>
        {currentLang !== "it" && (
          <div className="mt-3 pt-3 border-t border-warm-100 flex items-center gap-3 text-xs">
            <button onClick={cloneFromIt} className="inline-flex items-center gap-1 text-warm-700 hover:text-warm-900">
              <Copy size={12} /> Copia contenuto IT
            </button>
            {hasTranslation && (
              <button onClick={handleDeleteTranslation} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800">
                <Trash2 size={12} /> Rimuovi traduzione
              </button>
            )}
            <span className="text-warm-500 ml-auto">
              {hasTranslation ? "Traduzione esistente — sovrascrive il testo IT" : "Nessuna traduzione: gli utenti in questa lingua vedono il testo IT"}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Nome template {currentLang !== "it" && <span className="text-warm-400 normal-case text-[10px] font-normal">(unico, sempre dal template base)</span>}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (currentLang === "it") setDirty(true); }}
            placeholder="Es. Invito Salone 2026"
            disabled={currentLang !== "it"}
            className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none disabled:bg-warm-50 disabled:text-warm-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Oggetto email <span className="text-warm-400 normal-case text-[10px] font-normal">({currentLang.toUpperCase()})</span>
          </label>
          <input type="text" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} placeholder="Es. Sei invitato al nostro evento"
            className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
          <div className="flex gap-1 mt-2 flex-wrap">
            {VARIABLES.map((v) => (
              <button key={v} onClick={() => { setSubject(subject + " " + v); setDirty(true); }} type="button"
                className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors font-mono">{v}</button>
            ))}
          </div>
        </div>
      </div>

      <EmailBlockEditor blocks={blocks} onChange={(b) => { setBlocks(b); setDirty(true); }} />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-warm-200 shrink-0">
              <h2 className="text-lg font-semibold text-warm-900">Anteprima Email — {currentLang.toUpperCase()}</h2>
              <button onClick={() => setShowPreview(false)} className="text-warm-400 hover:text-warm-600 text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-auto bg-warm-100 p-4">
              <iframe srcDoc={previewHtml} className="w-full min-h-[600px] bg-white rounded-lg shadow" title="Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
