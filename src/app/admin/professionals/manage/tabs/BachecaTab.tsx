"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Bell, FileText, Package, Image as ImageIcon, KeyRound, X } from "lucide-react";

interface NotificationGroup {
  // Quando l'admin invia a più ruoli contemporaneamente, creiamo N notifiche
  // con stesso title/body/link/createdAt ma audience diverso. Le aggreghiamo
  // in UI come "1 messaggio inviato a [Rivenditori, Agenti]".
  key: string;            // hash di title+body+createdAt
  ids: string[];
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  audiences: string[];    // ["RESELLER","AGENT"] o ["__ALL__"] se audience NULL
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  catalog: FileText,
  price_list: Package,
  media: ImageIcon,
  credentials: KeyRound,
  info: Bell,
  update: Bell,
};
const TYPE_LABEL: Record<string, string> = {
  catalog: "Catalogo",
  price_list: "Listino",
  media: "Media",
  credentials: "Credenziali",
  info: "Informazione",
  update: "Aggiornamento",
};

const ROLE_LABEL: Record<string, string> = {
  RESELLER: "Rivenditori",
  AGENT: "Agenti",
  ARCHITECT_DESIGNER: "Architetti / Designer",
  PRESS: "Stampa",
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
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/professional-notifications", { cache: "no-store" });
      const j = await r.json();
      if (j.success) {
        // Aggrego per (title|body|link|createdAt±60s) per gestire i multi-ruolo
        const byKey = new Map<string, NotificationGroup>();
        for (const n of j.data) {
          const ts = Math.floor(new Date(n.createdAt).getTime() / 60000); // minuto
          const key = `${n.type}|${n.title}|${n.body || ""}|${n.link || ""}|${ts}`;
          const aud = n.audience || "__ALL__";
          const existing = byKey.get(key);
          if (existing) {
            existing.ids.push(n.id);
            existing.audiences.push(aud);
          } else {
            byKey.set(key, {
              key,
              ids: [n.id],
              type: n.type,
              title: n.title,
              body: n.body,
              link: n.link,
              audiences: [aud],
              createdAt: n.createdAt,
            });
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
      await Promise.all(g.ids.map((id) =>
        fetch(`/api/admin/professional-notifications/${id}`, { method: "DELETE" })
      ));
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
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}
        </div>
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
                      <button
                        onClick={() => deleteGroup(g)}
                        disabled={deletingKey === g.key}
                        className="p-1.5 text-warm-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Elimina novità"
                      >
                        {deletingKey === g.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <NewNotificationForm
          onClose={() => setFormOpen(false)}
          onCreated={() => { setFormOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function NewNotificationForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<string>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  // Default: rivenditori + agenti
  const [audienceMode, setAudienceMode] = useState<"selected" | "all">("selected");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["RESELLER", "AGENT"]);
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const submit = async () => {
    if (!title.trim()) { alert("Il titolo è obbligatorio"); return; }
    if (audienceMode === "selected" && selectedRoles.length === 0) {
      alert("Seleziona almeno un destinatario o scegli 'Tutti i professionisti'.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/professional-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title: title.trim(),
          body: body.trim() || null,
          link: link.trim() || null,
          audiences: audienceMode === "all" ? null : selectedRoles,
        }),
      });
      const data = await res.json();
      if (data.success) onCreated();
      else alert(data.error || "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-warm-800">Nuova novità per i professionisti</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-800"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-warm-300 rounded text-sm bg-white">
                <option value="info">Informazione</option>
                <option value="catalog">Catalogo</option>
                <option value="price_list">Listino</option>
                <option value="media">Media</option>
                <option value="credentials">Credenziali</option>
                <option value="update">Aggiornamento</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Listino prezzi 2026 disponibile"
                className="w-full px-3 py-2 border border-warm-300 rounded text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione (opzionale)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              placeholder="Dettagli, contesto o istruzioni per il professionista."
              className="w-full px-3 py-2 border border-warm-300 rounded text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Link (opzionale)</label>
            <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
              placeholder="Es. /area-professionisti/listino-prezzi"
              className="w-full px-3 py-2 border border-warm-300 rounded text-sm font-mono" />
            <p className="text-[10px] text-warm-400 mt-1">Se presente, comparirà come pulsante “Apri” sulla card della bacheca.</p>
          </div>

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
                      <input type="checkbox" checked={selectedRoles.includes(r)}
                        onChange={() => toggleRole(r)} className="accent-warm-800" />
                      <span className="text-sm text-warm-700">{ROLE_LABEL[r]}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-warm-400 mt-1">Di default vengono selezionati Rivenditori e Agenti (i destinatari più frequenti).</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-warm-200">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm text-warm-600 hover:bg-warm-100 rounded">
            Annulla
          </button>
          <button onClick={submit} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-800 text-white text-sm font-medium rounded hover:bg-warm-900 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Pubblica novità
          </button>
        </div>
      </div>
    </div>
  );
}
