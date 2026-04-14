"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowRight, Plus, Trash2, Check, AlertCircle, Loader2, Power, Search, ExternalLink, Pencil, X } from "lucide-react";

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  enabled: boolean;
  hits: number;
  lastHitAt: string | null;
  note: string | null;
  createdAt: string;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ fromPath: "", toPath: "", statusCode: 301, note: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fromPath: "", toPath: "", statusCode: 301, note: "" });
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/redirects");
    const data = await res.json();
    if (data.success) setRedirects(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.fromPath || !form.toPath) {
      showToast("Compila origine e destinazione", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Redirect creato", "success");
        setForm({ fromPath: "", toPath: "", statusCode: 301, note: "" });
        setShowNew(false);
        fetchAll();
      } else {
        showToast(data.error || "Errore", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (r: Redirect) => {
    const res = await fetch(`/api/admin/redirects/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setRedirects((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !r.enabled } : x)));
    } else {
      showToast(data.error || "Errore", "error");
    }
  };

  const startEdit = (r: Redirect) => {
    setEditingId(r.id);
    setEditForm({ fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode, note: r.note || "" });
  };

  const handleEditSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/redirects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setRedirects((prev) => prev.map((x) => (x.id === id ? { ...x, ...editForm, note: editForm.note || null } : x)));
        setEditingId(null);
        showToast("Redirect aggiornato", "success");
      } else {
        showToast(data.error || "Errore", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Redirect) => {
    if (!confirm(`Eliminare il redirect ${r.fromPath} → ${r.toPath}?`)) return;
    const res = await fetch(`/api/admin/redirects/${r.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setRedirects((prev) => prev.filter((x) => x.id !== r.id));
      showToast("Redirect eliminato", "success");
    } else {
      showToast(data.error || "Errore", "error");
    }
  };

  const filtered = redirects.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.fromPath.toLowerCase().includes(q) || r.toPath.toLowerCase().includes(q);
  });

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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Redirect URL</h1>
          <p className="text-sm text-warm-500 mt-1">
            Reindirizza vecchi URL a nuove pagine. La destinazione deve essere una pagina esistente del sito.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900"
        >
          <Plus size={16} /> Nuovo redirect
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-warm-800 mb-4">Nuovo redirect</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Da (URL vecchio)</label>
              <input
                type="text"
                value={form.fromPath}
                onChange={(e) => setForm((p) => ({ ...p, fromPath: e.target.value }))}
                placeholder="/vecchio-prodotto"
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-warm-400 mt-1">Path completo, deve iniziare con /</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">A (URL nuovo)</label>
              <input
                type="text"
                value={form.toPath}
                onChange={(e) => setForm((p) => ({ ...p, toPath: e.target.value }))}
                placeholder="/prodotti/sedia-14"
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-warm-400 mt-1">Deve essere una pagina esistente del sito (verifica automatica)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipo</label>
              <select
                value={form.statusCode}
                onChange={(e) => setForm((p) => ({ ...p, statusCode: parseInt(e.target.value) }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
              >
                <option value={301}>301 — Permanente (raccomandato per SEO)</option>
                <option value={302}>302 — Temporaneo</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nota (facoltativa)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Vecchio link da campagna 2023"
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Crea redirect
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100">
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per URL…"
            className="w-full border border-warm-200 rounded pl-9 pr-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-warm-400 bg-white rounded-xl border border-warm-200">
          {search ? "Nessun redirect corrisponde alla ricerca." : "Nessun redirect impostato. Aggiungine uno per reindirizzare un vecchio URL."}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Da</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">A</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Tipo</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-warm-600 uppercase">Hits</th>
                <th className="px-4 py-2 w-32 text-right text-[10px] font-semibold text-warm-600 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-warm-50 ${!r.enabled ? "opacity-50" : ""}`}>
                  {editingId === r.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.fromPath}
                          onChange={(e) => setEditForm((p) => ({ ...p, fromPath: e.target.value }))}
                          className="w-full border border-warm-300 rounded px-2 py-1 text-xs font-mono focus:border-warm-800 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editForm.note}
                          onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                          placeholder="Nota"
                          className="w-full mt-1 border border-warm-200 rounded px-2 py-1 text-[10px] focus:border-warm-800 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.toPath}
                          onChange={(e) => setEditForm((p) => ({ ...p, toPath: e.target.value }))}
                          className="w-full border border-warm-300 rounded px-2 py-1 text-xs font-mono focus:border-warm-800 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.statusCode}
                          onChange={(e) => setEditForm((p) => ({ ...p, statusCode: parseInt(e.target.value) }))}
                          className="border border-warm-300 rounded px-2 py-1 text-xs focus:border-warm-800 focus:outline-none"
                        >
                          <option value={301}>301</option>
                          <option value={302}>302</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-warm-400">{r.hits}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditSave(r.id)}
                            disabled={saving}
                            title="Salva"
                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            title="Annulla"
                            className="p-1 text-warm-400 hover:text-warm-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <code className="text-xs text-warm-700">{r.fromPath}</code>
                        {r.note && <p className="text-[10px] text-warm-400 mt-0.5">{r.note}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ArrowRight size={12} className="text-warm-400" />
                          <code className="text-xs text-warm-700">{r.toPath}</code>
                          {/^https?:\/\//.test(r.toPath) && <ExternalLink size={10} className="text-warm-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${r.statusCode === 301 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {r.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-warm-600">{r.hits}</span>
                        {r.lastHitAt && (
                          <p className="text-[10px] text-warm-400">{new Date(r.lastHitAt).toLocaleDateString("it-IT")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(r)}
                            title="Modifica"
                            className="p-1 text-warm-400 hover:text-warm-800"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleEnabled(r)}
                            title={r.enabled ? "Disattiva" : "Attiva"}
                            className={`p-1 ${r.enabled ? "text-green-600 hover:text-green-800" : "text-warm-400 hover:text-warm-800"}`}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Elimina"
                            className="p-1 text-warm-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
