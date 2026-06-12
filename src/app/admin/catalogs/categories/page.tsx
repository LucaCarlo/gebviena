"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  showInPublic: boolean;
}

export default function CatalogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ slug: "", label: "", sortOrder: 0, isActive: true, showInPublic: true });
  const [newForm, setNewForm] = useState({ slug: "", label: "", sortOrder: 0, isActive: true, showInPublic: true });
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/catalog-categories");
    const data = await res.json();
    setCategories(data.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newForm.label) { setError("Etichetta obbligatoria"); return; }
    setError("");
    const res = await fetch("/api/admin/catalog-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error || "Errore"); return; }
    setNewForm({ slug: "", label: "", sortOrder: 0, isActive: true, showInPublic: true });
    setShowNew(false);
    fetchData();
  };

  const handleUpdate = async (id: string) => {
    setError("");
    const res = await fetch(`/api/admin/catalog-categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error || "Errore"); return; }
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Eliminare la categoria "${label}"?`)) return;
    const res = await fetch(`/api/admin/catalog-categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) { alert(data.error || "Errore eliminazione"); return; }
    fetchData();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditForm({ slug: c.slug, label: c.label, sortOrder: c.sortOrder, isActive: c.isActive, showInPublic: c.showInPublic });
    setError("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Categorie cataloghi</h1>
          <p className="text-sm text-warm-500 mt-1">Gestisci le categorie usate per raggruppare i cataloghi sul sito pubblico e nell&rsquo;area professionisti.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowNew(true); setError(""); }}
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuova categoria
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded mb-4">{error}</div>
      )}

      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">Nuova categoria</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Etichetta *</label>
              <input
                type="text"
                value={newForm.label}
                onChange={(e) => setNewForm((p) => ({ ...p, label: e.target.value }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
                placeholder="es. Poster"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Slug</label>
              <input
                type="text"
                value={newForm.slug}
                onChange={(e) => setNewForm((p) => ({ ...p, slug: e.target.value }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
                placeholder="auto"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Ordine</label>
              <input
                type="number"
                value={newForm.sortOrder}
                onChange={(e) => setNewForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newForm.isActive} onChange={(e) => setNewForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-warm-800" />
              <span className="text-sm text-warm-700">Attiva</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newForm.showInPublic} onChange={(e) => setNewForm((p) => ({ ...p, showInPublic: e.target.checked }))} className="w-4 h-4 accent-warm-800" />
              <span className="text-sm text-warm-700">Visibile sul sito pubblico</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-warm-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-warm-900">Crea</button>
            <button onClick={() => { setShowNew(false); setError(""); }} className="px-4 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100">Annulla</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Etichetta</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Attiva</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Pubblica</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Ordine</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-warm-50 transition-colors">
                  {editingId === c.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editForm.slug}
                          onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))}
                          className="border border-warm-300 rounded px-2 py-1 text-sm w-full bg-warm-50"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editForm.label}
                          onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
                          className="border border-warm-300 rounded px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-warm-800" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="checkbox" checked={editForm.showInPublic} onChange={(e) => setEditForm((p) => ({ ...p, showInPublic: e.target.checked }))} className="w-4 h-4 accent-warm-800" />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={editForm.sortOrder}
                          onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                          className="border border-warm-300 rounded px-2 py-1 text-sm w-16"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleUpdate(c.id)} className="p-1.5 text-green-600 hover:text-green-800" title="Salva"><Check size={16} /></button>
                          <button onClick={() => { setEditingId(null); setError(""); }} className="p-1.5 text-warm-400 hover:text-warm-800" title="Annulla"><X size={16} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-warm-100 text-warm-700 text-xs rounded">{c.slug}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-warm-800">{c.label}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-warm-300"}`} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[11px] ${c.showInPublic ? "text-green-700" : "text-warm-400"}`}>{c.showInPublic ? "Sì" : "No"}</span>
                      </td>
                      <td className="px-6 py-4 text-warm-500">{c.sortOrder}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(c)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(c.id, c.label)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors" title="Elimina">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuna categoria. Creane una con &ldquo;Nuova categoria&rdquo;.</div>
          )}
        </div>
      )}

      <p className="text-[11px] text-warm-500 mt-3 leading-relaxed">
        <strong>Pubblica</strong> = visibile anche su <code>/professionisti/cataloghi</code>. Se &ldquo;No&rdquo;, la categoria appare solo nell&rsquo;area professionisti.
      </p>
    </div>
  );
}
