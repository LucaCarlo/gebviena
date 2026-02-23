"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Typology {
  id: string;
  value: string;
  label: string;
}

interface Category {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  typologies: { typology: Typology }[];
  subcategories: { id: string; value: string; label: string }[];
}

const CONTENT_LABELS: Record<string, string> = {
  products: "Prodotti",
  projects: "Progetti",
  campaigns: "Campagne",
};

export default function CategoriesPage() {
  const params = useParams();
  const contentType = params.contentType as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [typologies, setTypologies] = useState<Typology[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ value: "", label: "", sortOrder: 0, typologyIds: [] as string[] });
  const [newForm, setNewForm] = useState({ value: "", label: "", typologyIds: [] as string[] });
  const [showNew, setShowNew] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, typRes] = await Promise.all([
      fetch(`/api/categories?contentType=${contentType}`),
      fetch(`/api/typologies?contentType=${contentType}`),
    ]);
    const catData = await catRes.json();
    const typData = await typRes.json();
    setCategories(catData.data || []);
    setTypologies(typData.data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [contentType]);

  const handleCreate = async () => {
    if (!newForm.value || !newForm.label) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, ...newForm }),
    });
    setNewForm({ value: "", label: "", typologyIds: [] });
    setShowNew(false);
    fetchData();
  };

  const handleUpdate = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa categoria?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    fetchData();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditForm({
      value: c.value,
      label: c.label,
      sortOrder: c.sortOrder,
      typologyIds: c.typologies.map((t) => t.typology.id),
    });
  };

  const toggleTypology = (ids: string[], id: string) => {
    return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Categorie {CONTENT_LABELS[contentType]}</h1>
          <p className="text-sm text-warm-500 mt-1">Gestisci le categorie per i {CONTENT_LABELS[contentType]?.toLowerCase()}. Ogni categoria puo appartenere a piu tipologie.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuova categoria
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">Nuova categoria</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Valore</label>
              <input
                type="text"
                value={newForm.value}
                onChange={(e) => setNewForm((p) => ({ ...p, value: e.target.value }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
                placeholder="es. Sedie"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Etichetta</label>
              <input
                type="text"
                value={newForm.label}
                onChange={(e) => setNewForm((p) => ({ ...p, label: e.target.value }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
                placeholder="es. Sedie"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Tipologie associate</label>
            <div className="flex flex-wrap gap-2">
              {typologies.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setNewForm((p) => ({ ...p, typologyIds: toggleTypology(p.typologyIds, t.id) }))}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    newForm.typologyIds.includes(t.id)
                      ? "bg-warm-800 text-white border-warm-800"
                      : "bg-white text-warm-600 border-warm-300 hover:border-warm-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-warm-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-warm-900">Crea</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100">Annulla</button>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Valore</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Etichetta</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Tipologie</th>
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
                          value={editForm.value}
                          onChange={(e) => setEditForm((p) => ({ ...p, value: e.target.value }))}
                          className="border border-warm-300 rounded px-2 py-1 text-sm w-full"
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
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {typologies.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEditForm((p) => ({ ...p, typologyIds: toggleTypology(p.typologyIds, t.id) }))}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                editForm.typologyIds.includes(t.id)
                                  ? "bg-warm-800 text-white border-warm-800"
                                  : "bg-white text-warm-600 border-warm-300"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
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
                          <button onClick={() => handleUpdate(c.id)} className="p-1.5 text-green-600 hover:text-green-800"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-warm-400 hover:text-warm-800"><X size={16} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-warm-100 text-warm-700 text-xs rounded">{c.value}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-warm-800">{c.label}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.typologies.map((t) => (
                            <span key={t.typology.id} className="px-1.5 py-0.5 bg-warm-100 text-warm-600 text-[10px] rounded">
                              {t.typology.label}
                            </span>
                          ))}
                          {c.typologies.length === 0 && <span className="text-warm-400 text-xs">Nessuna</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-warm-500">{c.sortOrder}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(c)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
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
            <div className="text-center py-12 text-warm-400">Nessuna categoria trovata</div>
          )}
        </div>
      )}
    </div>
  );
}
