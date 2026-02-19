"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Check } from "lucide-react";
import { PRODUCT_CATEGORIES, CATEGORY_SUBCATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

interface ProductFormProps {
  productId?: string;
}

interface DesignerOption {
  id: string;
  name: string;
}

interface FinishOption {
  id: string;
  name: string;
  category: string;
  colorHex: string | null;
  imageUrl: string | null;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [allFinishes, setAllFinishes] = useState<FinishOption[]>([]);
  const [selectedFinishIds, setSelectedFinishIds] = useState<string[]>([]);
  const [finishFilter, setFinishFilter] = useState("TUTTI");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    designerName: "",
    designerId: "",
    category: "SEDUTE",
    subcategory: "",
    description: "",
    materials: "",
    dimensions: "",
    imageUrl: "",
    isFeatured: false,
    isNew: false,
  });

  useEffect(() => {
    fetch("/api/designers")
      .then((r) => r.json())
      .then((data) => { if (data.success) setDesigners(data.data || []); });
    fetch("/api/finishes")
      .then((r) => r.json())
      .then((data) => { if (data.success) setAllFinishes(data.data || []); });
  }, []);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    const res = await fetch(`/api/products/${productId}`);
    const data = await res.json();
    if (data.success) {
      const p = data.data;
      setForm({
        name: p.name,
        slug: p.slug,
        designerName: p.designerName || "",
        designerId: p.designerId || "",
        category: p.category,
        subcategory: p.subcategory || "",
        description: p.description || "",
        materials: p.materials || "",
        dimensions: p.dimensions || "",
        imageUrl: p.imageUrl,
        isFeatured: p.isFeatured,
        isNew: p.isNew || false,
      });
      if (p.finishes && Array.isArray(p.finishes)) {
        setSelectedFinishIds(p.finishes.map((pf: { finish: { id: string } }) => pf.finish.id));
      }
    }
  }, [productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: productId ? prev.slug : slugify(name),
    }));
  };

  const handleDesignerChange = (designerId: string) => {
    const designer = designers.find((d) => d.id === designerId);
    setForm((prev) => ({
      ...prev,
      designerId,
      designerName: designer?.name || prev.designerName,
    }));
  };

  const toggleFinish = (finishId: string) => {
    setSelectedFinishIds((prev) =>
      prev.includes(finishId)
        ? prev.filter((id) => id !== finishId)
        : [...prev, finishId]
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) setForm((prev) => ({ ...prev, imageUrl: data.data.url }));
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = productId ? `/api/products/${productId}` : "/api/products";
      const method = productId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, finishIds: selectedFinishIds }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/products");
      } else {
        setError(data.error || "Errore");
      }
    } catch { setError("Errore di connessione"); } finally { setLoading(false); }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const finishCats = Array.from(new Set(allFinishes.map((f) => f.category))) as string[];
  const filteredFinishes = finishFilter === "TUTTI"
    ? allFinishes
    : allFinishes.filter((f) => f.category === finishFilter);

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Designer *</label>
            <select
              value={form.designerId}
              onChange={(e) => handleDesignerChange(e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Seleziona o scrivi sotto —</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={form.designerName}
              onChange={(e) => updateField("designerName", e.target.value)}
              className="w-full mt-1 border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
              placeholder="Nome designer (testo libero)"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Categoria *</label>
            <select
              value={form.category}
              onChange={(e) => {
                const newCat = e.target.value;
                setForm((prev) => ({ ...prev, category: newCat, subcategory: "" }));
              }}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              {PRODUCT_CATEGORIES.filter((c) => c.value !== "TUTTI").map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Sottocategoria</label>
            <select
              value={form.subcategory}
              onChange={(e) => updateField("subcategory", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Nessuna —</option>
              {(CATEGORY_SUBCATEGORIES[form.category] || []).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Dimensioni</label>
            <input
              type="text"
              value={form.dimensions}
              onChange={(e) => updateField("dimensions", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="es. L 60 x P 55 x H 80 cm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Materiali</label>
          <input
            type="text"
            value={form.materials}
            onChange={(e) => updateField("materials", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="es. Legno massello di faggio curvato"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Immagine *</label>
          <div className="flex items-start gap-4">
            {form.imageUrl && (
              <div className="w-24 h-24 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                <Image src={form.imageUrl} alt="Preview" fill className="object-cover" sizes="96px" />
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-warm-300 rounded cursor-pointer hover:border-warm-500 transition-colors">
                <Upload size={16} className="text-warm-400" />
                <span className="text-sm text-warm-500">{uploading ? "Caricamento..." : "Carica immagine"}</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
              <p className="text-xs text-warm-400 mt-1">oppure inserisci URL:</p>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                className="w-full mt-1 border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={form.isFeatured}
              onChange={(e) => updateField("isFeatured", e.target.checked)}
              className="rounded border-warm-300"
            />
            <label htmlFor="featured" className="text-sm text-warm-600">In evidenza</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isNew"
              checked={form.isNew}
              onChange={(e) => updateField("isNew", e.target.checked)}
              className="rounded border-warm-300"
            />
            <label htmlFor="isNew" className="text-sm text-warm-600">Nuovo</label>
          </div>
        </div>
      </div>

      {/* === FINITURE / TESSUTI ASSOCIATI === */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-warm-800">Finiture associate</h3>
            <p className="text-xs text-warm-400 mt-0.5">
              Seleziona le finiture disponibili per questo prodotto ({selectedFinishIds.length} selezionate)
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFinishFilter("TUTTI")}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              finishFilter === "TUTTI"
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            Tutti
          </button>
          {finishCats.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFinishFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                finishFilter === cat
                  ? "bg-warm-800 text-white"
                  : "bg-warm-100 text-warm-600 hover:bg-warm-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Finish grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-1">
          {filteredFinishes.map((finish) => {
            const isSelected = selectedFinishIds.includes(finish.id);
            return (
              <button
                key={finish.id}
                type="button"
                onClick={() => toggleFinish(finish.id)}
                className={`relative group rounded overflow-hidden border-2 transition-all ${
                  isSelected ? "border-warm-800 ring-1 ring-warm-800" : "border-transparent hover:border-warm-300"
                }`}
                title={`${finish.name} (${finish.category})`}
              >
                <div className="aspect-square relative">
                  {finish.imageUrl ? (
                    <Image src={finish.imageUrl} alt={finish.name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: finish.colorHex || "#e8e6e3" }} />
                  )}
                </div>
                {isSelected && (
                  <div className="absolute inset-0 bg-warm-800/40 flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                )}
                <p className="text-[8px] text-warm-500 text-center py-0.5 truncate px-0.5 bg-white">
                  {finish.name}
                </p>
              </button>
            );
          })}
        </div>

        {allFinishes.length === 0 && (
          <p className="text-sm text-warm-400 text-center py-4">
            Nessuna finitura disponibile. Crea delle finiture dalla sezione Finiture.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : productId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
