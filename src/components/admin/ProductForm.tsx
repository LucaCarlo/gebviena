"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Plus, X, Upload, FileText, Trash2 } from "lucide-react";
import ImageUploadField from "./ImageUploadField";
import GalleryUploadField from "./GalleryUploadField";
import SeoPanel from "./SeoPanel";
import PconConfigurator from "./PconConfigurator";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { TInput, TTextarea, TRichText } from "./TranslatableField";

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

interface ExtraDim {
  name: string;
  blockId: string;
  values: string;
  freeText: string;
  image: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const tCtx = useTranslationCtx();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [designers, setDesigners] = useState<DesignerOption[]>([]);
  const [typologies, setTypologies] = useState<TypologyOption[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [dimensionBlocks, setDimensionBlocks] = useState<{ id: string; name: string; labels: string }[]>([]);
  const [extraDimensions, setExtraDimensions] = useState<ExtraDim[]>([]);
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
    galleryOrientations: "{}",
    variants: "[]",
    dimensionImage: "",
    techSheetUrl: "",
    model2dUrl: "",
    model3dUrl: "",
    pconUrl: "",
    pconMoc: "",
    pconBan: "",
    pconSid: "",
    pconOvc: "",
    year: "",
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
        galleryOrientations: p.galleryOrientations || "{}",
        variants: p.variants || "[]",
        dimensionImage: p.dimensionImage || "",
        techSheetUrl: p.techSheetUrl || "",
        model2dUrl: p.model2dUrl || "",
        model3dUrl: p.model3dUrl || "",
        pconUrl: p.pconUrl || "",
        pconMoc: p.pconMoc || "",
        pconBan: p.pconBan || "",
        pconSid: p.pconSid || "",
        pconOvc: p.pconOvc || "",
        year: p.year != null ? String(p.year) : "",
        isFeatured: p.isFeatured,
        isNew: p.isNew || false,
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        seoKeywords: p.seoKeywords || "[]",
      });
      setExtraDimensions(
        (p.extraDimensions || []).map((d: { name?: string | null; blockId?: string | null; values?: string | null; freeText?: string | null; image?: string | null }) => ({
          name: d.name || "",
          blockId: d.blockId || "",
          values: d.values || "{}",
          freeText: d.freeText || "",
          image: d.image || "",
        }))
      );
    }
  }, [productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  // Track previous subcategory to detect changes
  const prevSubcategoryRef = useRef(form.subcategory);

  // Auto-assign typologies ONLY when category changes (not on load)
  useEffect(() => {
    if (form.subcategory && form.subcategory !== prevSubcategoryRef.current) {
      const cat = allCategories.find((c) => c.value === form.subcategory);
      if (cat && cat.typologies.length > 0) {
        const autoValues = cat.typologies.map((t) => t.typology.value).join(",");
        setForm((prev) => ({ ...prev, category: autoValues }));
      }
    }
    prevSubcategoryRef.current = form.subcategory;
  }, [form.subcategory, allCategories]);

  // Parse current typologies from category field
  const selectedTypologies = useMemo(() => {
    return (form.category || "").split(",").filter(Boolean);
  }, [form.category]);

  const toggleTypology = (value: string) => {
    const current = selectedTypologies;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setForm((prev) => ({ ...prev, category: next.join(",") }));
  };

  // DimensionBlock helpers
  const selectedBlock = dimensionBlocks.find((b) => b.id === form.dimensionBlockId);
  const blockLabels: string[] = useMemo(() => {
    if (!selectedBlock) return [];
    try { return JSON.parse(selectedBlock.labels); } catch { return []; }
  }, [selectedBlock]);

  const dimensionVals: Record<string, string> = useMemo(() => {
    try { return JSON.parse(form.dimensionValues); } catch { return {}; }
  }, [form.dimensionValues]);

  const updateDimensionValue = (label: string, value: string) => {
    const next = { ...dimensionVals, [label]: value };
    updateField("dimensionValues", JSON.stringify(next));
  };

  const handleDimensionBlockChange = (blockId: string) => {
    setForm((prev) => ({ ...prev, dimensionBlockId: blockId, dimensionValues: prev.dimensionValues || "{}" }));
  };

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
    // If editing in a non-default language, save translation only
    if (tCtx?.isTranslating) {
      const ok = await tCtx.saveTranslation();
      setLoading(false);
      if (ok) router.push("/admin/products");
      return;
    }
    const filterValuesToBlock = (valuesJson: string, blockId: string): string => {
      if (!blockId) return valuesJson;
      const block = dimensionBlocks.find((b) => b.id === blockId);
      if (!block) return valuesJson;
      let labels: string[] = [];
      try { labels = JSON.parse(block.labels); } catch { labels = []; }
      if (labels.length === 0) return valuesJson;
      try {
        const vals: Record<string, string> = JSON.parse(valuesJson);
        const cleaned: Record<string, string> = {};
        for (const l of labels) if (vals[l] != null) cleaned[l] = vals[l];
        return JSON.stringify(cleaned);
      } catch { return valuesJson; }
    };

    try {
      const url = productId ? `/api/products/${productId}` : "/api/products";
      const method = productId ? "PUT" : "POST";
      const payload = {
        ...form,
        dimensionValues: filterValuesToBlock(form.dimensionValues, form.dimensionBlockId),
        imageUrl: form.coverImage || "",
        year: form.year ? parseInt(form.year, 10) : null,
        model2dUrl: form.model2dUrl || null,
        model3dUrl: form.model3dUrl || null,
        pconUrl: form.pconUrl || null,
        pconMoc: form.pconMoc || null,
        pconBan: form.pconBan || null,
        pconSid: form.pconSid || null,
        pconOvc: form.pconOvc || null,
        techSheetUrl: form.techSheetUrl || null,
        extraDimensions: extraDimensions.map((d) => {
          const cleanedValues = d.values ? filterValuesToBlock(d.values, d.blockId) : "";
          return {
            name: d.name || null,
            blockId: d.blockId || null,
            values: cleanedValues && cleanedValues !== "{}" ? cleanedValues : null,
            freeText: d.freeText || null,
            image: d.image || null,
          };
        }),
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

  const galleryOrientations: Record<string, "h" | "v"> = (() => {
    try {
      const parsed = JSON.parse(form.galleryOrientations || "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch { return {}; }
  })();

  const setGalleryOrientation = (url: string, orient: "" | "h" | "v") => {
    const next = { ...galleryOrientations };
    if (orient === "") {
      delete next[url];
    } else {
      next[url] = orient;
    }
    updateField("galleryOrientations", JSON.stringify(next));
  };

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

  const addExtraDimension = () => {
    setExtraDimensions((prev) => [...prev, { name: "", blockId: "", values: "{}", freeText: "", image: "" }]);
  };
  const removeExtraDimension = (index: number) => {
    setExtraDimensions((prev) => prev.filter((_, i) => i !== index));
  };
  const updateExtraDimension = (index: number, patch: Partial<ExtraDim>) => {
    setExtraDimensions((prev) => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
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
          <TInput
            fieldKey="name"
            defaultValue={form.name}
            onDefaultChange={handleNameChange}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Slug</label>
            <TInput
              fieldKey="slug"
              defaultValue={form.slug}
              onDefaultChange={(v) => updateField("slug", v)}
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
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Categoria *</label>
            <select
              value={form.subcategory}
              onChange={(e) => {
                const newSub = e.target.value;
                setForm((prev) => ({ ...prev, subcategory: newSub }));
              }}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Seleziona —</option>
              {allCategories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipologie</label>
            <div className="min-h-[42px] border border-warm-200 rounded px-4 py-2.5 bg-white flex flex-wrap gap-2 items-center">
              {typologies.map((t) => (
                <label key={t.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypologies.includes(t.value)}
                    onChange={() => toggleTypology(t.value)}
                    className="rounded border-warm-300 text-warm-800 focus:ring-warm-800"
                  />
                  <span className="text-xs text-warm-700">{t.label}</span>
                </label>
              ))}
              {typologies.length === 0 && (
                <span className="text-sm text-warm-400">Caricamento...</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Materiali</label>
            <TInput
              fieldKey="materials"
              defaultValue={form.materials}
              onDefaultChange={(v) => updateField("materials", v)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="es. Legno massello di faggio curvato"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Annata</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => updateField("year", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="es. 1859"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione</label>
          <TRichText
            fieldKey="description"
            defaultValue={form.description}
            onDefaultChange={(html) => updateField("description", html)}
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

        {galleryUrls.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Orientamento carosello
            </label>
            <p className="text-[10px] text-warm-400 mb-3">
              Per ogni immagine scegli se mostrarla nel carosello orizzontale o in quello verticale. Se lasci &quot;Auto&quot;, l&apos;orientamento viene rilevato dall&apos;aspect ratio dell&apos;immagine.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryUrls.map((url) => {
                const orient = galleryOrientations[url] || "";
                return (
                  <div key={url} className="border border-warm-200 rounded-lg p-2 bg-warm-50">
                    <div className="relative aspect-square rounded overflow-hidden mb-2 bg-white">
                      <Image src={url} alt="" fill className="object-cover" sizes="200px" />
                    </div>
                    <div className="flex gap-1">
                      {(["", "h", "v"] as const).map((val) => (
                        <button
                          key={val || "auto"}
                          type="button"
                          onClick={() => setGalleryOrientation(url, val)}
                          className={`flex-1 text-[10px] py-1 rounded border ${
                            orient === val
                              ? "bg-warm-900 text-white border-warm-900"
                              : "bg-white text-warm-600 border-warm-300 hover:border-warm-500"
                          }`}
                        >
                          {val === "" ? "Auto" : val === "h" ? "Orizz." : "Vert."}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DIMENSIONI */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Dimensioni</h3>

        <ImageUploadField
          label="Immagine dimensioni"
          value={form.dimensionImage}
          onChange={(url) => updateField("dimensionImage", url)}
          onRemove={() => updateField("dimensionImage", "")}
          purpose="dimensions"
          folder="products"
          helpText="Disegno con le misure del prodotto (proporzioni libere)"
        />

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
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Misure</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {blockLabels.map((label) => (
                <div key={label}>
                  <label className="block text-[11px] text-warm-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={dimensionVals[label] || ""}
                    onChange={(e) => updateDimensionValue(label, e.target.value)}
                    className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                    placeholder="es. 60 cm"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Misure (testo libero)</label>
            <TTextarea
              fieldKey="dimensions"
              defaultValue={form.dimensions}
              onDefaultChange={(v) => updateField("dimensions", v)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder={"es.\nL 60 cm\nP 55 cm\nH 80 cm"}
              rows={4}
            />
          </div>
        )}
      </div>

      {/* DIMENSIONI AGGIUNTIVE */}
      {extraDimensions.map((dim, idx) => {
        const selectedBlockExtra = dimensionBlocks.find((b) => b.id === dim.blockId);
        const extraLabels: string[] = (() => {
          if (!selectedBlockExtra) return [];
          try { return JSON.parse(selectedBlockExtra.labels); } catch { return []; }
        })();
        const extraVals: Record<string, string> = (() => {
          try { return JSON.parse(dim.values); } catch { return {}; }
        })();
        const setValue = (label: string, value: string) => {
          const next = { ...extraVals, [label]: value };
          updateExtraDimension(idx, { values: JSON.stringify(next) });
        };
        return (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
                Dimensione aggiuntiva {idx + 2}
              </h3>
              <button
                type="button"
                onClick={() => removeExtraDimension(idx)}
                className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1"
              >
                <Trash2 size={14} /> Rimuovi
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome (opzionale)</label>
              <input
                type="text"
                value={dim.name}
                onChange={(e) => updateExtraDimension(idx, { name: e.target.value })}
                placeholder="es. Versione XL"
                className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              />
            </div>

            <ImageUploadField
              label="Immagine dimensioni"
              value={dim.image}
              onChange={(url) => updateExtraDimension(idx, { image: url })}
              onRemove={() => updateExtraDimension(idx, { image: "" })}
              purpose="dimensions"
              folder="products"
              helpText="Disegno con le misure del prodotto (proporzioni libere)"
            />

            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Blocco dimensioni</label>
              <select
                value={dim.blockId}
                onChange={(e) => updateExtraDimension(idx, { blockId: e.target.value, values: dim.values || "{}" })}
                className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              >
                <option value="">— Nessun blocco (testo libero) —</option>
                {dimensionBlocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {dim.blockId && extraLabels.length > 0 ? (
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Misure</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {extraLabels.map((label) => (
                    <div key={label}>
                      <label className="block text-[11px] text-warm-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={extraVals[label] || ""}
                        onChange={(e) => setValue(label, e.target.value)}
                        className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                        placeholder="es. 60 cm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Misure (testo libero)</label>
                <textarea
                  value={dim.freeText}
                  onChange={(e) => updateExtraDimension(idx, { freeText: e.target.value })}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  placeholder={"es.\nL 60 cm\nP 55 cm\nH 80 cm"}
                  rows={4}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addExtraDimension}
        className="w-full border border-dashed border-warm-300 rounded-xl py-4 text-sm text-warm-600 hover:border-warm-500 hover:text-warm-800 transition-colors inline-flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Aggiungi dimensione
      </button>

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

      {/* CONFIGURATORE 3D pCon */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Configuratore pCon</h3>
          <p className="text-[10px] text-warm-400 mt-0.5">
            Imposta la serie, il codice articolo e le varianti da mostrare sulla pagina prodotto. Se nessuna configurazione è impostata, l&apos;accordion 3D non verrà visualizzato.
          </p>
        </div>
        <PconConfigurator
          value={{
            moc: form.pconMoc,
            ban: form.pconBan,
            sid: form.pconSid,
            ovc: form.pconOvc,
          }}
          onChange={(next) => {
            setForm((prev) => ({
              ...prev,
              pconMoc: next.moc || "",
              pconBan: next.ban || "",
              pconSid: next.sid || "",
              pconOvc: next.ovc || "",
            }));
          }}
        />
      </div>

      {/* DOCUMENTAZIONE PDF */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Documentazione PDF</h3>
        <PdfUploadField
          label="Scheda Tecnica"
          value={form.techSheetUrl}
          onChange={(url) => updateField("techSheetUrl", url)}
          folder="tech-sheets"
        />
        <FileUploadField
          label="Modello 2D"
          value={form.model2dUrl}
          onChange={(url) => updateField("model2dUrl", url)}
          folder="tech-sheets"
          accept=".zip,.rar,.dwg,.dxf,.pdf,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed,image/vnd.dwg,application/dxf,application/pdf"
          fileLabel="file"
        />
        <FileUploadField
          label="Modello 3D"
          value={form.model3dUrl}
          onChange={(url) => updateField("model3dUrl", url)}
          folder="tech-sheets"
          accept=".zip,.rar,.dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.3ds,.fbx,.skp,.gltf,.glb,.dae,.ply,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed"
          fileLabel="file"
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

/* ---- PDF Upload Sub-component ---- */
function PdfUploadField({
  label,
  value,
  onChange,
  folder = "tech-sheets",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipCompression", "true");
    formData.append("folder", folder);
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
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">{label}</label>
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
            {uploading ? "Caricamento..." : `Carica PDF ${label.toLowerCase()}`}
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

/* ---- Generic File Upload Sub-component ---- */
function FileUploadField({
  label,
  value,
  onChange,
  folder = "tech-sheets",
  accept,
  fileLabel = "file",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept: string;
  fileLabel?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipCompression", "true");
    formData.append("folder", folder);
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
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">{label}</label>
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
            Scarica
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
            {uploading ? "Caricamento..." : `Carica ${fileLabel} ${label.toLowerCase()}`}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
