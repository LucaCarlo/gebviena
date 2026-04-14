"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, Package, Search, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import SeoPanel from "./SeoPanel";
import { useMemo } from "react";

type ProductPickerItem = {
  id: string;
  name: string;
  designerName?: string;
  category?: string;
  imageUrl?: string;
  coverImage?: string | null;
};

interface AwardFormProps {
  awardId?: string;
}

export default function AwardForm({ awardId }: AwardFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    organization: "",
    description: "",
    imageUrl: "",
    url: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
    isActive: true,
  });

  const [allProducts, setAllProducts] = useState<ProductPickerItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    setProductsLoading(true);
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((data) => { if (data.success) setAllProducts(data.data); })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.designerName || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [allProducts, productSearch]);

  const selectedProducts = useMemo(
    () => allProducts.filter((p) => selectedProductIds.includes(p.id)),
    [allProducts, selectedProductIds]
  );

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const loadAward = useCallback(async () => {
    if (!awardId) return;
    const res = await fetch(`/api/awards/${awardId}`);
    const data = await res.json();
    if (data.success) {
      const a = data.data;
      setForm({
        name: a.name || "",
        year: a.year || new Date().getFullYear(),
        organization: a.organization || "",
        description: a.description || "",
        imageUrl: a.imageUrl || "",
        url: a.url || "",
        seoTitle: a.seoTitle || "",
        seoDescription: a.seoDescription || "",
        seoKeywords: a.seoKeywords || "[]",
        isActive: a.isActive ?? true,
      });
      if (Array.isArray(a.products)) {
        setSelectedProductIds(a.products.map((pp: { productId: string }) => pp.productId));
      }
    }
  }, [awardId]);

  useEffect(() => { loadAward(); }, [loadAward]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, imageUrl: data.data.url }));
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = awardId ? `/api/awards/${awardId}` : "/api/awards";
      const method = awardId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productIds: selectedProductIds }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/awards");
      } else {
        setError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Anno *
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => updateField("year", parseInt(e.target.value) || 0)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Organizzazione
            </label>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => updateField("organization", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <RichTextEditor
          label="Descrizione"
          value={form.description}
          onChange={(html) => updateField("description", html)}
        />

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Immagine
          </label>
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

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            URL Esterno
          </label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => updateField("url", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Associated products */}
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

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Cerca prodotti per nome, designer o categoria..."
            className="w-full border border-warm-300 rounded px-4 py-2.5 pl-10 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        {productsLoading ? (
          <div className="text-center py-8 text-sm text-warm-500">Caricamento prodotti...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-sm text-warm-500">Nessun prodotto trovato</div>
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
                      src={product.coverImage || product.imageUrl || "/placeholder.png"}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-warm-800 truncate">{product.name}</p>
                    {product.designerName && (
                      <p className="text-[10px] text-warm-500 truncate">{product.designerName}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SeoPanel
        seoTitle={form.seoTitle}
        seoDescription={form.seoDescription}
        seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
        content={form.description}
        onChange={(field, value) => {
          if (field === "seoKeywords") {
            updateField("seoKeywords", JSON.stringify(value));
          } else {
            updateField(field, value as string);
          }
        }}
      />

      <div className="bg-white border border-warm-200 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => updateField("isActive", e.target.checked)}
            className="w-4 h-4 accent-warm-800"
          />
          <span className="text-sm text-warm-800 font-medium">Visibile sul sito</span>
          <span className="text-xs text-warm-500">
            (se disattivato, il premio non comparirà nella pagina &ldquo;Designer e Premi&rdquo;)
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : awardId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/awards")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
