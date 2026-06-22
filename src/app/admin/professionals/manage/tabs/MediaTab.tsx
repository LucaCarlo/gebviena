"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Trash2, X, FolderOpen, Box } from "lucide-react";

/** Foto area professionisti — separate dalle immagini-prodotto del sito.
 *  Si organizzano per Tipologia (foto generiche di categoria) o per Prodotto
 *  (foto specifiche di un singolo prodotto). */
interface ProfessionalImage {
  id: string;
  productId: string | null;
  typology: string | null;
  fileUrl: string;
  fileName: string;
  storage: string;
  sortOrder: number;
  createdAt: string;
}

interface Typology {
  id: string;
  value: string;
  label: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  imageUrl: string;
  coverImage: string | null;
}

type View = "typology" | "product";

export default function MediaTab() {
  const [view, setView] = useState<View>("typology");
  const [typologies, setTypologies] = useState<Typology[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [typologyCounts, setTypologyCounts] = useState<Record<string, number>>({});
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  // Modal state — un'unica modal usata sia per typology che per product
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"typology" | "product">("typology");
  const [modalValue, setModalValue] = useState<string>("");
  const [modalLabel, setModalLabel] = useState<string>("");
  const [modalImages, setModalImages] = useState<ProfessionalImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Filtri vista "per prodotto"
  const [search, setSearch] = useState("");
  const [filterTypology, setFilterTypology] = useState<string>("");

  // Carica tipologie + prodotti + summary counters
  const loadAll = useCallback(async () => {
    try {
      const [tRes, pRes, tSum, pSum] = await Promise.all([
        fetch("/api/typologies?contentType=products").then((r) => r.json()),
        fetch("/api/products?limit=500&admin=true").then((r) => r.json()),
        fetch("/api/admin/professional-images?summary=typology").then((r) => r.json()),
        fetch("/api/admin/professional-images?summary=product").then((r) => r.json()),
      ]);
      setTypologies(tRes.data || []);
      setProducts(pRes.data || []);
      const tc: Record<string, number> = {};
      for (const x of tSum.data || []) tc[x.typology] = x.count;
      setTypologyCounts(tc);
      const pc: Record<string, number> = {};
      for (const x of pSum.data || []) pc[x.productId] = x.count;
      setProductCounts(pc);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openTypology = async (t: Typology) => {
    setModalKind("typology");
    setModalValue(t.value);
    setModalLabel(t.label);
    setModalImages([]);
    setModalOpen(true);
    const r = await fetch(`/api/admin/professional-images?typology=${encodeURIComponent(t.value)}`);
    const j = await r.json();
    setModalImages(j.data || []);
  };

  const openProduct = async (p: Product) => {
    setModalKind("product");
    setModalValue(p.id);
    setModalLabel(p.name);
    setModalImages([]);
    setModalOpen(true);
    const r = await fetch(`/api/admin/professional-images?productId=${encodeURIComponent(p.id)}`);
    const j = await r.json();
    setModalImages(j.data || []);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    if (modalKind === "typology") fd.append("typology", modalValue);
    else fd.append("productId", modalValue);
    for (const f of arr) fd.append("files", f);
    try {
      const r = await fetch("/api/admin/professional-images", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success) {
        setModalImages((prev) => [...prev, ...j.data]);
        // Aggiorna counters
        if (modalKind === "typology") {
          setTypologyCounts((prev) => ({ ...prev, [modalValue]: (prev[modalValue] || 0) + j.data.length }));
        } else {
          setProductCounts((prev) => ({ ...prev, [modalValue]: (prev[modalValue] || 0) + j.data.length }));
        }
      } else {
        alert("Errore upload: " + (j.error || "?"));
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (id: string) => {
    if (!confirm("Eliminare questa foto?")) return;
    const r = await fetch(`/api/admin/professional-images/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (j.success) {
      setModalImages((prev) => prev.filter((i) => i.id !== id));
      if (modalKind === "typology") {
        setTypologyCounts((prev) => ({ ...prev, [modalValue]: Math.max(0, (prev[modalValue] || 1) - 1) }));
      } else {
        setProductCounts((prev) => ({ ...prev, [modalValue]: Math.max(0, (prev[modalValue] || 1) - 1) }));
      }
    }
  };

  const filteredProducts = useMemo(() => {
    let arr = products;
    if (filterTypology) arr = arr.filter((p) => p.category && p.category.includes(filterTypology));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }
    return arr;
  }, [products, filterTypology, search]);

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-warm-200 pb-3">
        <button
          onClick={() => setView("typology")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "typology" ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-100"
          }`}
        >
          <FolderOpen size={16} /> Per Tipologia
        </button>
        <button
          onClick={() => setView("product")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "product" ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-100"
          }`}
        >
          <Box size={16} /> Per Prodotto
        </button>
      </div>

      <p className="text-sm text-warm-600">
        Foto dedicate all&apos;area professionisti — <strong>separate</strong> dalle immagini-prodotto del sito. Possono essere caricate per <em>tipologia</em> (foto generiche di categoria, es. ambientazioni o ispirazioni) o per <em>prodotto</em> (foto specifiche di un singolo articolo).
      </p>

      {view === "typology" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {typologies.map((t) => {
            const count = typologyCounts[t.value] || 0;
            return (
              <button
                key={t.id}
                onClick={() => openTypology(t)}
                className="bg-white border border-warm-200 rounded-lg p-4 text-left hover:border-warm-800 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-warm-800 uppercase tracking-wider">{t.label}</div>
                    <div className="text-xs text-warm-500 mt-1">{count} {count === 1 ? "foto" : "foto"}</div>
                  </div>
                  <FolderOpen size={20} className="text-warm-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === "product" && (
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Cerca prodotto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
            />
            <select
              value={filterTypology}
              onChange={(e) => setFilterTypology(e.target.value)}
              className="border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
            >
              <option value="">Tutte le tipologie</option>
              {typologies.map((t) => (
                <option key={t.id} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-warm-500">{filteredProducts.length} prodotti</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const count = productCounts[p.id] || 0;
              const thumb = p.coverImage || p.imageUrl;
              return (
                <button
                  key={p.id}
                  onClick={() => openProduct(p)}
                  className="bg-white border border-warm-200 rounded-lg p-2 text-left hover:border-warm-800 hover:shadow-sm transition-all"
                >
                  <div className="relative w-full aspect-square bg-warm-50 rounded overflow-hidden mb-2">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={p.name} className="w-full h-full object-contain" />
                    )}
                    {count > 0 && (
                      <span className="absolute top-1 right-1 bg-warm-800 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">{count}</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-warm-800 truncate">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-warm-200">
              <div>
                <div className="text-xs uppercase tracking-wider text-warm-500">
                  {modalKind === "typology" ? "Tipologia" : "Prodotto"}
                </div>
                <h3 className="text-lg font-semibold text-warm-800">{modalLabel}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-warm-500 hover:text-warm-800">
                <X size={20} />
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
              }}
              className={`m-5 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? "border-warm-800 bg-warm-50" : "border-warm-300"}`}
            >
              <Upload size={28} className="mx-auto text-warm-400 mb-2" />
              <p className="text-sm text-warm-700">
                {uploading ? "Caricamento in corso…" : "Trascina qui le foto o "}
                {!uploading && (
                  <label className="text-warm-900 underline cursor-pointer">
                    seleziona dal computer
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                )}
              </p>
              <p className="text-[10px] text-warm-400 mt-2">JPG, PNG, WEBP — più file insieme</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {modalImages.length === 0 ? (
                <p className="text-sm text-warm-500 text-center py-8">Nessuna foto caricata.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {modalImages.map((img) => (
                    <div key={img.id} className="relative bg-warm-50 rounded overflow-hidden group">
                      <div className="aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.fileUrl} alt={img.fileName} className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => deleteImage(img.id)}
                        className="absolute top-1 right-1 bg-white/90 text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Elimina"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

