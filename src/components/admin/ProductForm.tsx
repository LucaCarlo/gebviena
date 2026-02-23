"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import ImageUploadField from "./ImageUploadField";
import GalleryUploadField from "./GalleryUploadField";

interface ProductFormProps {
  productId?: string;
}

interface DesignerOption {
  id: string;
  name: string;
}

interface TypologyOption {
  id: string;
  value: string;
  label: string;
}

interface CategoryOption {
  id: string;
  value: string;
  label: string;
  typologies: { typology: { id: string; value: string } }[];
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [typologies, setTypologies] = useState<TypologyOption[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    designerName: "",
    designerId: "",
    category: "",
    subcategory: "",
    description: "",
    materials: "",
    dimensions: "",
    coverImage: "",
    heroImage: "",
    sideImage: "",
    galleryImages: "[]",
    isFeatured: false,
    isNew: false,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/designers").then((r) => r.json()),
      fetch("/api/typologies?contentType=products").then((r) => r.json()),
      fetch("/api/categories?contentType=products").then((r) => r.json()),
    ]).then(([dData, tData, cData]) => {
      if (dData.success) setDesigners(dData.data || []);
      setTypologies(tData.data || []);
      setAllCategories(cData.data || []);
    });
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
        coverImage: p.coverImage || p.imageUrl || "",
        heroImage: p.heroImage || "",
        sideImage: p.sideImage || "",
        galleryImages: p.galleryImages || "[]",
        isFeatured: p.isFeatured,
        isNew: p.isNew || false,
      });
    }
  }, [productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  // Filter categories based on selected typology (category field stores the typology value)
  const filteredCategories = useMemo(() => {
    if (!form.category) return allCategories;
    return allCategories.filter((c) =>
      c.typologies.some((t) => t.typology.value === form.category)
    );
  }, [allCategories, form.category]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = productId ? `/api/products/${productId}` : "/api/products";
      const method = productId ? "PUT" : "POST";
      const payload = {
        ...form,
        imageUrl: form.coverImage || "",
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const galleryUrls: string[] = (() => {
    try { return JSON.parse(form.galleryImages); } catch { return []; }
  })();

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>
      )}

      {/* INFO PRODOTTO */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Informazioni prodotto</h3>

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
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipologia *</label>
            <select
              value={form.category}
              onChange={(e) => {
                const newCat = e.target.value;
                setForm((prev) => ({ ...prev, category: newCat, subcategory: "" }));
              }}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Seleziona —</option>
              {typologies.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Categoria</label>
            <select
              value={form.subcategory}
              onChange={(e) => updateField("subcategory", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Nessuna —</option>
              {filteredCategories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
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

      {/* IMMAGINI */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Immagini prodotto</h3>
          <p className="text-[10px] text-warm-400 mt-0.5">
            Tutte le immagini vengono automaticamente convertite in WebP e ottimizzate per il web
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploadField
            label="Immagine Cover"
            value={form.coverImage}
            onChange={(url) => updateField("coverImage", url)}
            onRemove={() => updateField("coverImage", "")}
            purpose="cover"
            folder="products"
            helpText="Mostrata nella griglia prodotti dello shop (800x1000px)"
          />

          <ImageUploadField
            label="Immagine Hero"
            value={form.heroImage}
            onChange={(url) => updateField("heroImage", url)}
            onRemove={() => updateField("heroImage", "")}
            purpose="hero"
            folder="products"
            helpText="Banner a tutta larghezza nella pagina prodotto (1920x1080px)"
          />

          <ImageUploadField
            label="Immagine Laterale"
            value={form.sideImage}
            onChange={(url) => updateField("sideImage", url)}
            onRemove={() => updateField("sideImage", "")}
            purpose="side"
            folder="products"
            helpText="Sezione descrizione, affiancata al testo (800x1200px)"
          />
        </div>

        <GalleryUploadField
          label="Galleria immagini"
          value={galleryUrls}
          onChange={(urls) => updateField("galleryImages", JSON.stringify(urls))}
          folder="products"
          helpText="Immagini aggiuntive per il carosello ispirazione. Trascina per riordinare."
        />
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
