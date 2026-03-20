"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Plus, X, Upload, FileText, Trash2 } from "lucide-react";
import ImageUploadField from "./ImageUploadField";
import GalleryUploadField from "./GalleryUploadField";
import RichTextEditor from "./RichTextEditor";
import SeoPanel from "./SeoPanel";

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

interface DimensionBlockOption {
  id: string;
  name: string;
  labels: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [typologies, setTypologies] = useState<TypologyOption[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [dimensionBlocks, setDimensionBlocks] = useState<DimensionBlockOption[]>([]);
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
    dimensionBlockId: "",
    dimensionValues: "{}",
    coverImage: "",
    heroImage: "",
    sideImage: "",
    galleryImages: "[]",
    variants: "[]",
    dimensionImage: "",
    techSheetUrl: "",
    isFeatured: false,
    isNew: false,
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/designers").then((r) => r.json()),
      fetch("/api/typologies?contentType=products").then((r) => r.json()),
      fetch("/api/categories?contentType=products").then((r) => r.json()),
      fetch("/api/dimension-blocks").then((r) => r.json()),
    ]).then(([dData, tData, cData, dbData]) => {
      if (dData.success) setDesigners(dData.data || []);
      setTypologies(tData.data || []);
      setAllCategories(cData.data || []);
      if (dbData.success) setDimensionBlocks(dbData.data || []);
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
        dimensionBlockId: p.dimensionBlockId || "",
        dimensionValues: p.dimensionValues || "{}",
        coverImage: p.coverImage || p.imageUrl || "",
        heroImage: p.heroImage || "",
        sideImage: p.sideImage || "",
        galleryImages: p.galleryImages || "[]",
        variants: p.variants || "[]",
        dimensionImage: p.dimensionImage || "",
        techSheetUrl: p.techSheetUrl || "",
        isFeatured: p.isFeatured,
        isNew: p.isNew || false,
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        seoKeywords: p.seoKeywords || "[]",
      });
    }
  }, [productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  // Filter categories based on selected typology
  const filteredCategories = useMemo(() => {
    if (!form.category) return allCategories;
    return allCategories.filter((c) =>
      c.typologies.some((t) => t.typology.value === form.category)
    );
  }, [allCategories, form.category]);

  // Get selected dimension block labels
  const selectedBlock = useMemo(() => {
    if (!form.dimensionBlockId) return null;
    return dimensionBlocks.find((b) => b.id === form.dimensionBlockId) || null;
  }, [dimensionBlocks, form.dimensionBlockId]);

  const blockLabels: string[] = useMemo(() => {
    if (!selectedBlock) return [];
    try { return JSON.parse(selectedBlock.labels); } catch { return []; }
  }, [selectedBlock]);

  const dimValues: Record<string, string> = useMemo(() => {
    try { return JSON.parse(form.dimensionValues); } catch { return {}; }
  }, [form.dimensionValues]);

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

  const handleDimensionBlockChange = (blockId: string) => {
    setForm((prev) => ({
      ...prev,
      dimensionBlockId: blockId,
      dimensionValues: "{}",
    }));
  };

  const updateDimValue = (label: string, value: string) => {
    const next = { ...dimValues, [label]: value };
    setForm((prev) => ({ ...prev, dimensionValues: JSON.stringify(next) }));
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

  const variants: { name: string; image: string }[] = (() => {
    try { return JSON.parse(form.variants); } catch { return []; }
  })();

  const addVariant = () => {
    const next = [...variants, { name: "", image: "" }];
    updateField("variants", JSON.stringify(next));
  };

  const removeVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    updateField("variants", JSON.stringify(next));
  };

  const updateVariant = (index: number, field: "name" | "image", value: string) => {
    const next = variants.map((v, i) => i === index ? { ...v, [field]: value } : v);
    updateField("variants", JSON.stringify(next));
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-6 items-start">
      {/* Left: main form */}
      <div className="flex-1 min-w-0 max-w-4xl space-y-6">
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

        <div className="grid grid-cols-2 gap-4">
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

        <RichTextEditor
          label="Descrizione"
          value={form.description}
          onChange={(html) => updateField("description", html)}
        />

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

      {/* DIMENSIONI DINAMICHE */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Dimensioni</h3>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Blocco dimensioni</label>
          <select
            value={form.dimensionBlockId}
            onChange={(e) => handleDimensionBlockChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          >
            <option value="">— Nessun blocco (testo libero) —</option>
            {dimensionBlocks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {form.dimensionBlockId && blockLabels.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {blockLabels.map((label) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">{label}</label>
                <input
                  type="text"
                  value={dimValues[label] || ""}
                  onChange={(e) => updateDimValue(label, e.target.value)}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  placeholder="es. 60 cm"
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Dimensioni (testo libero)</label>
            <input
              type="text"
              value={form.dimensions}
              onChange={(e) => updateField("dimensions", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="es. L 60 x P 55 x H 80 cm"
            />
          </div>
        )}
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
            helpText="Mostrata nella griglia prodotti dello shop"
            recommendedSize="960 x 960 px (quadrata 1:1)"
            aspectRatio={1}
          />

          <ImageUploadField
            label="Immagine Hero"
            value={form.heroImage}
            onChange={(url) => updateField("heroImage", url)}
            onRemove={() => updateField("heroImage", "")}
            purpose="hero"
            folder="products"
            helpText="Banner a tutta larghezza nella pagina prodotto"
            recommendedSize="1600 x 1000 px (orizzontale 8:5)"
            aspectRatio={1600 / 1000}
          />

          <ImageUploadField
            label="Immagine Laterale"
            value={form.sideImage}
            onChange={(url) => updateField("sideImage", url)}
            onRemove={() => updateField("sideImage", "")}
            purpose="side"
            folder="products"
            helpText="Sezione descrizione, affiancata al testo"
            recommendedSize="1440 x 1920 px (verticale 3:4)"
            aspectRatio={1440 / 1920}
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

      {/* VARIANTI PRODOTTO */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Varianti prodotto</h3>
            <p className="text-[10px] text-warm-400 mt-0.5">Aggiungi le varianti con immagine e nome</p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1.5 text-xs font-medium text-warm-700 bg-warm-100 px-3 py-1.5 rounded-lg hover:bg-warm-200 transition-colors"
          >
            <Plus size={14} /> Aggiungi variante
          </button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-warm-400 font-light">Nessuna variante aggiunta</p>
        ) : (
          <div className="space-y-4">
            {variants.map((variant, i) => (
              <div key={i} className="flex gap-4 items-start p-4 bg-warm-50 rounded-lg border border-warm-200">
                <div className="w-28 flex-shrink-0">
                  <ImageUploadField
                    label=""
                    value={variant.image}
                    onChange={(url) => updateVariant(i, "image", url)}
                    onRemove={() => updateVariant(i, "image", "")}
                    purpose="variant"
                    folder="products"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome variante</label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                    placeholder="es. Faggio naturale"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="mt-6 p-1.5 text-warm-400 hover:text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IMMAGINE DIMENSIONI (disegno tecnico) */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Immagine dimensioni</h3>
        <ImageUploadField
          label="Disegno tecnico"
          value={form.dimensionImage}
          onChange={(url) => updateField("dimensionImage", url)}
          onRemove={() => updateField("dimensionImage", "")}
          purpose="dimensions"
          folder="products"
          helpText="Immagine orizzontale del disegno tecnico con misure"
          recommendedSize="1200 x 600 px (orizzontale 2:1)"
          aspectRatio={2 / 1}
        />
      </div>

      {/* SCHEDA TECNICA PDF */}
      <TechSheetUpload
        value={form.techSheetUrl}
        onChange={(url) => updateField("techSheetUrl", url)}
      />

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
      </div>

      {/* Right: SEO sidebar */}
      <div className="w-80 flex-shrink-0 hidden lg:block">
        <div className="sticky top-4">
          <SeoPanel
            seoTitle={form.seoTitle}
            seoDescription={form.seoDescription}
            seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
            slug={form.slug}
            content={form.description}
            onChange={(field, value) => {
              if (field === "seoKeywords") {
                updateField("seoKeywords", JSON.stringify(value));
              } else {
                updateField(field, value as string);
              }
            }}
          />
        </div>
      </div>
    </form>
  );
}

/* ---- Tech Sheet Upload Sub-component ---- */
function TechSheetUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipCompression", "true");
    formData.append("folder", "tech-sheets");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) onChange(data.data.url);
    } catch {
      // silent
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
        Scheda Tecnica PDF
      </h3>
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-lg border border-warm-200">
          <FileText size={20} className="text-warm-500 flex-shrink-0" />
          <span className="text-sm text-warm-700 truncate flex-1">{value.split("/").pop()}</span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-warm-500 hover:text-warm-800 underline"
          >
            Apri
          </a>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 text-warm-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-warm-300 rounded-lg cursor-pointer hover:border-warm-500 transition-colors">
          <Upload size={16} className="text-warm-400" />
          <span className="text-sm text-warm-500">
            {uploading ? "Caricamento..." : "Carica PDF scheda tecnica"}
          </span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
