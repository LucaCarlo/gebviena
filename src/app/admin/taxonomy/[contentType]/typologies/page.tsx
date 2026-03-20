"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

interface Typology {
  id: string;
  value: string;
  label: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  categories: { category: { id: string; value: string; label: string } }[];
}

const CONTENT_LABELS: Record<string, string> = {
  products: "Prodotti",
  projects: "Progetti",
  campaigns: "Campagne",
};

export default function TypologiesPage() {
  const params = useParams();
  const contentType = params.contentType as string;
  const [typologies, setTypologies] = useState<Typology[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ value: "", label: "", sortOrder: 0, imageUrl: "" });
  const [newForm, setNewForm] = useState({ value: "", label: "", imageUrl: "" });
  const [showNew, setShowNew] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/typologies?contentType=${contentType}`);
    const data = await res.json();
    setTypologies(data.data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [contentType]);

  const handleCreate = async () => {
    if (!newForm.value || !newForm.label) return;
    await fetch("/api/typologies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, value: newForm.value, label: newForm.label, imageUrl: newForm.imageUrl || null }),
    });
    setNewForm({ value: "", label: "", imageUrl: "" });
    setShowNew(false);
    fetchData();
  };

  const handleUpdate = async (id: string) => {
    await fetch(`/api/typologies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa tipologia?")) return;
    await fetch(`/api/typologies/${id}`, { method: "DELETE" });
    fetchData();
  };

  const startEdit = (t: Typology) => {
    setEditingId(t.id);
    setEditForm({ value: t.value, label: t.label, sortOrder: t.sortOrder, imageUrl: t.imageUrl || "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Tipologie {CONTENT_LABELS[contentType]}</h1>
          <p className="text-sm text-warm-500 mt-1">Gestisci le tipologie per i {CONTENT_LABELS[contentType]?.toLowerCase()}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuova tipologia
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-warm-800 mb-3">Nuova tipologia</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Valore (codice)</label>
              <input
                type="text"
                value={newForm.value}
                onChange={(e) => setNewForm((p) => ({ ...p, value: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
                placeholder="es. SEDUTE"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Etichetta</label>
              <input
                type="text"
                value={newForm.label}
                onChange={(e) => setNewForm((p) => ({ ...p, label: e.target.value }))}
                className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
                placeholder="es. Sedute"
              />
            </div>
          </div>
          <div className="mb-4">
            <ImageUploadField
              label="Immagine cover (quadrata)"
              value={newForm.imageUrl}
              onChange={(url) => setNewForm((p) => ({ ...p, imageUrl: url }))}
              onRemove={() => setNewForm((p) => ({ ...p, imageUrl: "" }))}
              purpose="cover"
              folder="typologies"
              recommendedSize="600x600px"
              aspectRatio={1}
            />
          </div>
          <div className="flex items-center gap-2">
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Cover</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Valore</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Etichetta</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Categorie</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Ordine</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {typologies.map((t) => (
                <tr key={t.id} className="hover:bg-warm-50 transition-colors">
                  {editingId === t.id ? (
                    <>
                      <td className="px-6 py-3" colSpan={6}>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Valore</label>
                            <input
                              type="text"
                              value={editForm.value}
                              onChange={(e) => setEditForm((p) => ({ ...p, value: e.target.value }))}
                              className="border border-warm-300 rounded px-2 py-1 text-sm w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Etichetta</label>
                            <input
                              type="text"
                              value={editForm.label}
                              onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
                              className="border border-warm-300 rounded px-2 py-1 text-sm w-full"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1">Ordine</label>
                            <input
                              type="number"
                              value={editForm.sortOrder}
                              onChange={(e) => setEditForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                              className="border border-warm-300 rounded px-2 py-1 text-sm w-24"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <ImageUploadField
                            label="Immagine cover (quadrata)"
                            value={editForm.imageUrl}
                            onChange={(url) => setEditForm((p) => ({ ...p, imageUrl: url }))}
                            onRemove={() => setEditForm((p) => ({ ...p, imageUrl: "" }))}
                            purpose="cover"
                            folder="typologies"
                            recommendedSize="600x600px"
                            aspectRatio={1}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdate(t.id)} className="flex items-center gap-1.5 bg-warm-800 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-warm-900"><Check size={14} /> Salva</button>
                          <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100"><X size={14} /> Annulla</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <div className="w-14 h-14 relative rounded overflow-hidden bg-warm-100 border border-warm-200">
                          {t.imageUrl ? (
                            <Image src={t.imageUrl} alt={t.label} fill className="object-cover" sizes="56px" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-warm-300 text-[10px]">N/A</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-warm-100 text-warm-700 text-xs rounded font-mono">{t.value}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-warm-800">{t.label}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {t.categories.map((c) => (
                            <span key={c.category.id} className="px-1.5 py-0.5 bg-warm-100 text-warm-600 text-[10px] rounded">
                              {c.category.label}
                            </span>
                          ))}
                          {t.categories.length === 0 && <span className="text-warm-400 text-xs">Nessuna</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-warm-500">{t.sortOrder}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(t)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
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
          {typologies.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuna tipologia trovata</div>
          )}
        </div>
      )}
    </div>
  );
}
