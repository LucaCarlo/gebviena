"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  showInPublic: boolean;
}

interface Draft {
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  showInPublic: boolean;
}

export default function CatalogCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>({ slug: "", label: "", sortOrder: 0, isActive: true, showInPublic: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/catalog-categories");
    const data = await res.json();
    if (data.success) setItems(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setDraft({ slug: c.slug, label: c.label, sortOrder: c.sortOrder, isActive: c.isActive, showInPublic: c.showInPublic });
    setError("");
  };
  const cancelEdit = () => { setEditingId(null); setDraft(null); setError(""); };

  const saveEdit = async (id: string) => {
    if (!draft) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/catalog-categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error || "Errore"); return; }
    setEditingId(null); setDraft(null);
    load();
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Eliminare la categoria "${label}"? I cataloghi associati restano ma diventano orfani.`)) return;
    const res = await fetch(`/api/admin/catalog-categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) { alert(data.error || "Errore eliminazione"); return; }
    load();
  };

  const create = async () => {
    if (!newDraft.label.trim()) { setError("La label è obbligatoria"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/catalog-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDraft),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error || "Errore"); return; }
    setCreating(false);
    setNewDraft({ slug: "", label: "", sortOrder: 0, isActive: true, showInPublic: true });
    load();
  };

  return (
    <div className="max-w-4xl">
      <Link href="/admin/catalogs" className="inline-flex items-center gap-1.5 text-xs text-warm-500 hover:text-warm-800 mb-3">
        <ArrowLeft size={12} /> Torna ai cataloghi
      </Link>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Categorie cataloghi</h1>
          <p className="text-sm text-warm-500 mt-1">
            Definisci le categorie usate per raggruppare i cataloghi nel sito pubblico e nell&rsquo;area professionisti.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => { setCreating(true); setError(""); }}
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuova categoria
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded mb-3">{error}</div>
      )}

      {loading ? (
        <div className="text-warm-400 text-sm">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider w-20">Ordine</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider w-24">Attiva</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider w-28">Pubblica</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider w-28">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {creating && (
                <tr className="bg-amber-50/40">
                  <td className="px-4 py-2">
                    <input
                      autoFocus
                      type="text"
                      value={newDraft.label}
                      onChange={(e) => setNewDraft({ ...newDraft, label: e.target.value })}
                      placeholder="es. Poster"
                      className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={newDraft.slug}
                      onChange={(e) => setNewDraft({ ...newDraft, slug: e.target.value })}
                      placeholder="auto"
                      className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={newDraft.sortOrder}
                      onChange={(e) => setNewDraft({ ...newDraft, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm focus:border-warm-800 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={newDraft.isActive} onChange={(e) => setNewDraft({ ...newDraft, isActive: e.target.checked })} className="w-4 h-4 accent-warm-800" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={newDraft.showInPublic} onChange={(e) => setNewDraft({ ...newDraft, showInPublic: e.target.checked })} className="w-4 h-4 accent-warm-800" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={create} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50" title="Crea">
                        <Save size={16} />
                      </button>
                      <button onClick={() => { setCreating(false); setError(""); }} className="p-1.5 text-warm-400 hover:bg-warm-50 rounded" title="Annulla">
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {items.map((c) => {
                const isEdit = editingId === c.id;
                return (
                  <tr key={c.id} className={isEdit ? "bg-warm-50/60" : "hover:bg-warm-50/50"}>
                    <td className="px-4 py-2">
                      {isEdit ? (
                        <input type="text" value={draft?.label || ""} onChange={(e) => setDraft({ ...draft!, label: e.target.value })} className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
                      ) : (
                        <span className="font-medium text-warm-800">{c.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEdit ? (
                        <input type="text" value={draft?.slug || ""} onChange={(e) => setDraft({ ...draft!, slug: e.target.value })} className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none" />
                      ) : (
                        <code className="text-xs text-warm-500">{c.slug}</code>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEdit ? (
                        <input type="number" value={draft?.sortOrder || 0} onChange={(e) => setDraft({ ...draft!, sortOrder: parseInt(e.target.value) || 0 })} className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
                      ) : (
                        <span className="text-warm-600">{c.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEdit ? (
                        <input type="checkbox" checked={!!draft?.isActive} onChange={(e) => setDraft({ ...draft!, isActive: e.target.checked })} className="w-4 h-4 accent-warm-800" />
                      ) : (
                        <span className={`inline-block w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-warm-300"}`} />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isEdit ? (
                        <input type="checkbox" checked={!!draft?.showInPublic} onChange={(e) => setDraft({ ...draft!, showInPublic: e.target.checked })} className="w-4 h-4 accent-warm-800" />
                      ) : (
                        <span className={`text-[11px] ${c.showInPublic ? "text-green-700" : "text-warm-400"}`}>{c.showInPublic ? "Sì" : "No"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEdit ? (
                          <>
                            <button onClick={() => saveEdit(c.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50" title="Salva">
                              <Save size={16} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 text-warm-400 hover:bg-warm-50 rounded" title="Annulla">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(c)} className="text-xs px-2.5 py-1 border border-warm-300 text-warm-700 hover:bg-warm-100 rounded">
                              Modifica
                            </button>
                            <button onClick={() => remove(c.id, c.label)} className="p-1.5 text-warm-400 hover:text-red-600" title="Elimina">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !creating && (
                <tr><td colSpan={6} className="text-center py-10 text-warm-400 text-sm">Nessuna categoria. Creane una con &ldquo;Nuova categoria&rdquo;.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[11px] text-warm-500 mt-3 leading-relaxed">
        <strong>Nota:</strong> <em>Pubblica</em> = visibile anche sul sito pubblico <code>/professionisti/cataloghi</code>. Se disattivata, la categoria appare solo nell&rsquo;area riservata professionisti.
      </div>
    </div>
  );
}
