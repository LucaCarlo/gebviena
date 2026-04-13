"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Package } from "lucide-react";
import { slugify } from "@/lib/utils";
import RichTextEditor from "./RichTextEditor";
import SeoPanel from "./SeoPanel";
import ImageUploadField from "./ImageUploadField";
import GalleryUploadField from "./GalleryUploadField";

interface Product {
  id: string;
  name: string;
  slug: string;
  designerName: string;
  category: string;
  coverImage: string | null;
  imageUrl: string;
}

interface ProjectFormProps {
  projectId?: string;
}

interface CategoryOption {
  id: string;
  value: string;
  label: string;
}

export default function ProjectForm({ projectId }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectCategories, setProjectCategories] = useState<CategoryOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "",
    country: "",
    city: "",
    year: "",
    architect: "",
    description: "",
    shortDescription: "",
    imageUrl: "",
    coverImage: "",
    heroImage: "",
    sideImage: "",
    galleryUrls: "[]",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
  });

  // Products state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);

  // Load all products and categories on mount
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const res = await fetch("/api/products?limit=100");
        const data = await res.json();
        if (data.success) {
          setAllProducts(data.data);
        }
      } catch {
        /* silent */
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
    fetch("/api/categories?contentType=projects")
      .then((r) => r.json())
      .then((data) => setProjectCategories(data.data || []));
  }, []);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    if (data.success) {
      const p = data.data;
      setForm({
        name: p.name,
        slug: p.slug,
        type: p.type,
        country: p.country,
        city: p.city || "",
        year: p.year ? String(p.year) : "",
        architect: p.architect || "",
        description: p.description || "",
        shortDescription: p.shortDescription || "",
        imageUrl: p.imageUrl,
        coverImage: p.coverImage || "",
        heroImage: p.heroImage || "",
        sideImage: p.sideImage || "",
        galleryUrls: p.galleryUrls || "[]",
        seoTitle: p.seoTitle || "",
        seoDescription: p.seoDescription || "",
        seoKeywords: p.seoKeywords || "[]",
      });
      // Load associated product IDs
      if (p.products && Array.isArray(p.products)) {
        setSelectedProductIds(
          p.products.map((pp: { productId: string }) => pp.productId)
        );
      }
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: projectId ? prev.slug : slugify(name),
    }));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.designerName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [allProducts, productSearch]);

  const selectedProducts = useMemo(
    () => allProducts.filter((p) => selectedProductIds.includes(p.id)),
    [allProducts, selectedProductIds]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = projectId
        ? `/api/projects/${projectId}`
        : "/api/projects";
      const method = projectId ? "PUT" : "POST";
      const payload = {
        ...form,
        year: form.year ? parseInt(form.year) : null,
        city: form.city || null,
        architect: form.architect || null,
        imageUrl: form.coverImage || form.heroImage || form.imageUrl || "",
        galleryUrls: form.galleryUrls === "[]" ? null : form.galleryUrls,
        productIds: selectedProductIds,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) router.push("/admin/projects");
      else setError(data.error || "Errore");
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const galleryUrlsParsed: string[] = (() => {
    try { return JSON.parse(form.galleryUrls); } catch { return []; }
  })();

  return (
    <form onSubmit={handleSubmit} className="flex gap-6 items-start">
      {/* Left: main form */}
      <div className="flex-1 min-w-0 max-w-3xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Main fields */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Nome *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Slug (URL pagina) *
          </label>
          <p className="text-[10px] text-warm-400 mb-1.5">
            Usato nell&apos;URL: /progetti/<span className="font-mono">{form.slug || "…"}</span>. Solo minuscole, numeri e trattini.
          </p>
          <input
            type="text"
            value={form.slug}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))
            }
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm font-mono focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Categoria *
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              <option value="">— Seleziona —</option>
              {projectCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Paese *
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, country: e.target.value }))
              }
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Citta
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Anno
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, year: e.target.value }))
              }
              placeholder="es. 2024"
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Architetto
            </label>
            <input
              type="text"
              value={form.architect}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, architect: e.target.value }))
              }
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Progetto
          </label>
          <p className="text-[10px] text-warm-400 mb-1.5">
            Testo breve mostrato nella colonna &ldquo;Progetto&rdquo; accanto a Foto da e Location.
          </p>
          <textarea
            value={form.shortDescription}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, shortDescription: e.target.value }))
            }
            rows={4}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <RichTextEditor
          label="Descrizione"
          value={form.description}
          onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
        />
      </div>

      {/* IMMAGINI PROGETTO */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
            Immagini progetto
          </h3>
          <p className="text-[10px] text-warm-400 mt-0.5">
            Tutte le immagini vengono automaticamente convertite in WebP e ottimizzate
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploadField
            label="Immagine Cover"
            value={form.coverImage}
            onChange={(url) => setForm((prev) => ({ ...prev, coverImage: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
            purpose="cover"
            folder="projects"
            helpText="Mostrata nella griglia dei progetti"
            recommendedSize="960 x 960 px (quadrata 1:1)"
            aspectRatio={1}
          />
          <ImageUploadField
            label="Immagine Hero"
            value={form.heroImage}
            onChange={(url) => setForm((prev) => ({ ...prev, heroImage: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, heroImage: "" }))}
            purpose="hero"
            folder="projects"
            helpText="Banner a tutta larghezza in cima alla pagina"
            recommendedSize="1600 x 1000 px (orizzontale 8:5)"
            aspectRatio={1600 / 1000}
          />
          <ImageUploadField
            label="Immagine Laterale"
            value={form.sideImage}
            onChange={(url) => setForm((prev) => ({ ...prev, sideImage: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, sideImage: "" }))}
            purpose="side"
            folder="projects"
            helpText="Sezione descrizione, affiancata ai dettagli"
            recommendedSize="1440 x 1920 px (verticale 3:4)"
            aspectRatio={1440 / 1920}
          />
        </div>

        <GalleryUploadField
          label="Galleria immagini (Slideshow)"
          value={galleryUrlsParsed}
          onChange={(urls) => setForm((prev) => ({ ...prev, galleryUrls: JSON.stringify(urls) }))}
          folder="projects"
          helpText="Immagini per lo slideshow. Trascina per riordinare."
        />
      </div>

      {/* Associated products section */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-warm-500" />
            <h3 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">
              Prodotti associati
            </h3>
          </div>
          <span className="text-xs text-warm-500 bg-warm-100 px-2.5 py-1 rounded-full">
            {selectedProductIds.length} selezionati
          </span>
        </div>

        {/* Selected products preview */}
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-lg px-2.5 py-1.5"
              >
                <div className="w-8 h-8 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                  <Image
                    src={product.coverImage || product.imageUrl || "/placeholder.png"}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <span className="text-xs text-warm-700 font-medium max-w-[120px] truncate">
                  {product.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className="text-warm-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
          />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Cerca prodotti per nome, designer o categoria..."
            className="w-full border border-warm-300 rounded px-4 py-2.5 pl-10 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        {/* Products grid */}
        {productsLoading ? (
          <div className="text-center py-8 text-sm text-warm-500">
            Caricamento prodotti...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-sm text-warm-500">
            Nessun prodotto trovato
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductIds.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-warm-800 bg-warm-50 ring-1 ring-warm-800"
                      : "border-warm-200 hover:border-warm-400 bg-white"
                  }`}
                >
                  <div className="w-10 h-10 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                    <Image
                      src={
                        product.coverImage ||
                        product.imageUrl ||
                        "/placeholder.png"
                      }
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-warm-800 truncate">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-warm-500 truncate">
                      {product.designerName}
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      isSelected
                        ? "bg-warm-800 border-warm-800"
                        : "border-warm-300"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : projectId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
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
                setForm((prev) => ({ ...prev, seoKeywords: JSON.stringify(value) }));
              } else {
                setForm((prev) => ({ ...prev, [field]: value as string }));
              }
            }}
          />
        </div>
      </div>
    </form>
  );
}
