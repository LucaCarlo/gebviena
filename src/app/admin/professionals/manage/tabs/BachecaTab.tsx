"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Bell, FileText, Package, Image as ImageIcon, KeyRound, X, Sparkles } from "lucide-react";

interface NotificationGroup {
  key: string;
  ids: string[];
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  audiences: string[];
  createdAt: string;
}

interface TranslationsMap {
  en: { title: string; body: string };
  de: { title: string; body: string };
  fr: { title: string; body: string };
  es: { title: string; body: string };
}

const EMPTY_TRANSLATIONS: TranslationsMap = {
  en: { title: "", body: "" },
  de: { title: "", body: "" },
  fr: { title: "", body: "" },
  es: { title: "", body: "" },
};

const LANG_LABEL: Record<string, string> = {
  it: "Italiano",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  catalog: FileText, price_list: Package, media: ImageIcon, credentials: KeyRound, info: Bell, update: Bell,
};
const TYPE_LABEL: Record<string, string> = {
  catalog: "Catalogo", price_list: "Listino", media: "Media", credentials: "Credenziali", info: "Informazione", update: "Aggiornamento",
};
const ROLE_LABEL: Record<string, string> = {
  RESELLER: "Rivenditori", AGENT: "Agenti", ARCHITECT_DESIGNER: "Architetti / Designer", PRESS: "Stampa",
};
const ALL_ROLES = ["RESELLER", "AGENT", "ARCHITECT_DESIGNER", "PRESS"];

function fmtDateTime(s: string): string {
  try {
    return new Date(s).toLocaleString("it-IT", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

export default function BachecaTab() {
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<NotificationGroup | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/professional-notifications", { cache: "no-store" });
      const j = await r.json();
      if (j.success) {
        const byKey = new Map<string, NotificationGroup>();
        for (const n of j.data) {
          const ts = Math.floor(new Date(n.createdAt).getTime() / 60000);
          const key = `${n.type}|${n.title}|${n.body || ""}|${n.link || ""}|${ts}`;
          const aud = n.audience || "__ALL__";
          const existing = byKey.get(key);
          if (existing) {
            existing.ids.push(n.id);
            existing.audiences.push(aud);
          } else {
            byKey.set(key, { key, ids: [n.id], type: n.type, title: n.title, body: n.body, link: n.link, audiences: [aud], createdAt: n.createdAt });
          }
        }
        setGroups(Array.from(byKey.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteGroup = async (g: NotificationGroup) => {
    if (!confirm(`Eliminare definitivamente "${g.title}"? Verranno rimosse anche le copie inviate ad altri ruoli (${g.ids.length} record).`)) return;
    setDeletingKey(g.key);
    try {
      await Promise.all(g.ids.map((id) => fetch(`/api/admin/professional-notifications/${id}`, { method: "DELETE" })));
      setGroups((prev) => prev.filter((x) => x.key !== g.key));
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-sm text-warm-600">
          {loading ? "Caricamento…" : `${groups.length} ${groups.length === 1 ? "novità pubblicata" : "novità pubblicate"}`}
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900"
        >
          <Plus size={16} /> Nuova novità
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-warm-500 bg-warm-50 border border-warm-200 rounded">
          Nessuna novità pubblicata. Clicca <strong>Nuova novità</strong> per inviarne una ai professionisti.
        </div>
      ) : (
        <div className="bg-white border border-warm-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Titolo</th>
                <th className="text-left px-4 py-3">Destinatari</th>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-right px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {groups.map((g) => {
                const Icon = TYPE_ICON[g.type] || Bell;
                const audienceText = g.audiences.includes("__ALL__")
                  ? "Tutti i professionisti"
                  : Array.from(new Set(g.audiences)).map((a) => ROLE_LABEL[a] || a).join(" · ");
                return (
                  <tr key={g.key} className="hover:bg-warm-50/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-warm-100 text-warm-700">
                        <Icon size={11} /> {TYPE_LABEL[g.type] || g.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-warm-900">{g.title}</div>
                      {g.body && <div className="text-xs text-warm-500 mt-0.5 max-w-md truncate">{g.body}</div>}
                    </td>
                    <td className="px-4 py-3 text-warm-700 text-xs">{audienceText}</td>
                    <td className="px-4 py-3 text-warm-600 text-xs">{fmtDateTime(g.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setEditingGroup(g)}
                          className="p-1.5 text-warm-400 hover:text-warm-800 hover:bg-warm-100 rounded"
                          title="Modifica novità"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteGroup(g)}
                          disabled={deletingKey === g.key}
                          className="p-1.5 text-warm-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Elimina novità"
                        >
                          {deletingKey === g.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <NotificationForm
          mode="create"
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}
      {editingGroup && (
        <NotificationForm
          mode="edit"
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={() => { setEditingGroup(null); load(); }}
        />
      )}
    </div>
  );
}

function NotificationForm({
  mode,
  group,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  group?: NotificationGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<string>(group?.type || "info");
  const [title, setTitle] = useState(group?.title || "");
  const [body, setBody] = useState(group?.body || "");
  const [link, setLink] = useState(group?.link || "");
  const initialAudienceMode: "all" | "selected" = group?.audiences.includes("__ALL__") ? "all" : "selected";
  const [audienceMode, setAudienceMode] = useState<"selected" | "all">(initialAudienceMode);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    group && !group.audiences.includes("__ALL__")
      ? Array.from(new Set(group.audiences))
      : ["RESELLER", "AGENT"]
  );
  const [translations, setTranslations] = useState<TranslationsMap>(EMPTY_TRANSLATIONS);
  const [activeLang, setActiveLang] = useState<"it" | "en" | "de" | "fr" | "es">("it");
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  // In edit mode, fetch existing translations for il primo id del gruppo.
  useEffect(() => {
    if (mode !== "edit" || !group) return;
    fetch(`/api/admin/professional-notifications/${group.ids[0]}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const map: TranslationsMap = { ...EMPTY_TRANSLATIONS };
        for (const tr of d.data.translations || []) {
          if (tr.languageCode in map) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (map as any)[tr.languageCode] = { title: tr.title || "", body: tr.body || "" };
          }
        }
        setTranslations(map);
      })
      .catch(() => { /* silent */ });
  }, [mode, group]);

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const translateAI = async () => {
    if (!title.trim()) { alert("Compila prima il titolo in italiano"); return; }
    setTranslating(true);
    try {
      const res = await fetch("/api/admin/professional-notifications/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslations({
          en: data.data.en || { title: "", body: "" },
          de: data.data.de || { title: "", body: "" },
          fr: data.data.fr || { title: "", body: "" },
          es: data.data.es || { title: "", body: "" },
        });
      } else {
        alert("Errore traduzione: " + (data.error || "?"));
      }
    } finally {
      setTranslating(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) { alert("Il titolo italiano è obbligatorio"); return; }
    if (audienceMode === "selected" && selectedRoles.length === 0) {
      alert("Seleziona almeno un destinatario o scegli 'Tutti i professionisti'.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type, title: title.trim(),
        body: body.trim() || null,
        link: link.trim() || null,
        translations: hasAnyTranslation(translations) ? translations : undefined,
      };
      if (mode === "create") {
        const res = await fetch("/api/admin/professional-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, audiences: audienceMode === "all" ? null : selectedRoles }),
        });
        const data = await res.json();
        if (data.success) onSaved();
        else alert(data.error || "Errore");
      } else if (mode === "edit" && group) {
        // PATCH ognuno degli id del gruppo (multi-audience condividono il contenuto)
        const results = await Promise.all(group.ids.map((id) =>
          fetch(`/api/admin/professional-notifications/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then((r) => r.json())
        ));
        if (results.every((r) => r.success)) onSaved();
        else alert("Errore durante l'aggiornamento di una o più copie");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-warm-800">
            {mode === "create" ? "Nuova novità per i professionisti" : "Modifica novità"}
          </h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-800"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-warm-300 rounded text-sm bg-white">
                <option value="info">Informazione</option>
                <option value="catalog">Catalogo</option>
                <option value="price_list">Listino</option>
                <option value="media">Media</option>
                <option value="credentials">Credenziali</option>
                <option value="update">Aggiornamento</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                Link (opzionale) — <span className="normal-case tracking-normal text-warm-500">uguale per tutte le lingue</span>
              </label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                placeholder="https://… o /area-professionisti/…"
                className="w-full px-3 py-2 border border-warm-300 rounded text-sm font-mono text-warm-900 placeholder:text-warm-400" />
            </div>
          </div>

          {/* Tabs per lingua + bottone Traduci con AI */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex gap-1 flex-wrap">
                {(["it", "en", "de", "fr", "es"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setActiveLang(l)}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded transition-colors ${
                      activeLang === l ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-700 hover:bg-warm-200"
                    }`}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={translateAI}
                disabled={translating || !title.trim()}
                className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded disabled:opacity-50"
                title="Traduce il contenuto italiano nelle 4 lingue tramite AI"
              >
                {translating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Traduci con AI
              </button>
            </div>

            {activeLang === "it" ? (
              <div className="space-y-3 bg-warm-50/40 border border-warm-200 rounded p-3">
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (italiano) *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es. Listino prezzi 2026 disponibile"
                    className="w-full px-3 py-2 border border-warm-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione (italiano)</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                    placeholder="Dettagli o istruzioni per il professionista."
                    className="w-full px-3 py-2 border border-warm-300 rounded text-sm resize-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-warm-50/40 border border-warm-200 rounded p-3">
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo ({LANG_LABEL[activeLang]})</label>
                  <input
                    type="text"
                    value={translations[activeLang].title}
                    onChange={(e) => setTranslations((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], title: e.target.value } }))}
                    placeholder={`Titolo in ${LANG_LABEL[activeLang]}`}
                    className="w-full px-3 py-2 border border-warm-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione ({LANG_LABEL[activeLang]})</label>
                  <textarea
                    value={translations[activeLang].body}
                    onChange={(e) => setTranslations((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], body: e.target.value } }))}
                    rows={3}
                    placeholder={`Descrizione in ${LANG_LABEL[activeLang]}`}
                    className="w-full px-3 py-2 border border-warm-300 rounded text-sm resize-none"
                  />
                </div>
                <p className="text-[10px] text-warm-400">Lascia vuoto per saltare questa lingua (i professionisti vedranno la versione italiana).</p>
              </div>
            )}
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">Destinatari</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={audienceMode === "all"} onChange={() => setAudienceMode("all")} className="accent-warm-800" />
                  <span className="text-sm text-warm-700">Tutti i professionisti</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={audienceMode === "selected"} onChange={() => setAudienceMode("selected")} className="accent-warm-800" />
                  <span className="text-sm text-warm-700">Solo i ruoli selezionati:</span>
                </label>
                {audienceMode === "selected" && (
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    {ALL_ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} className="accent-warm-800" />
                        <span className="text-sm text-warm-700">{ROLE_LABEL[r]}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {mode === "edit" && (
            <p className="text-[11px] text-warm-500 bg-warm-50 border border-warm-200 rounded px-3 py-2">
              I destinatari non possono essere modificati. Per cambiarli, elimina la notifica e ricreala.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-warm-200">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-warm-600 hover:bg-warm-100 rounded">
            Annulla
          </button>
          <button onClick={submit} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-800 text-white text-sm font-medium rounded hover:bg-warm-900 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (mode === "create" ? <Plus size={14} /> : <Pencil size={14} />)}
            {mode === "create" ? "Pubblica novità" : "Salva modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hasAnyTranslation(t: TranslationsMap): boolean {
  return Object.values(t).some((x) => x.title.trim() !== "");
}
