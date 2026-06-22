"use client";

import { useMemo, useState } from "react";
import { Download, X, FolderOpen, Box } from "lucide-react";

interface TypologyOpt { value: string; label: string }
interface ProductImage { id: string; fileUrl: string; fileName: string; productId: string | null; productName: string; productSlug: string; productCategory: string }
interface TypologyImage { id: string; fileUrl: string; fileName: string; typology: string }

export default function DigitalMediaClient({
  typologies,
  productImages,
  typologyImages,
}: {
  typologies: TypologyOpt[];
  productImages: ProductImage[];
  typologyImages: TypologyImage[];
}) {
  // Default vista "Per Prodotto" — è quello che cerca il professionista
  // tipicamente; "Per Tipologia" è una vista alternativa di esplorazione.
  const [view, setView] = useState<"typology" | "product">("product");
  const [selectedTypology, setSelectedTypology] = useState<string>("");
  const [productFilterTypology, setProductFilterTypology] = useState<string>("");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of typologies) m[t.value] = t.label;
    return m;
  }, [typologies]);

  // Conteggi per tipologia (foto typology + foto prodotti di quella tipologia)
  const typologyCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of typologies) c[t.value] = 0;
    for (const img of typologyImages) c[img.typology] = (c[img.typology] || 0) + 1;
    for (const img of productImages) {
      if (img.productCategory) {
        const cats = img.productCategory.split(",").map((s) => s.trim());
        for (const cat of cats) {
          if (c[cat] !== undefined) c[cat]++;
        }
      }
    }
    return c;
  }, [typologies, typologyImages, productImages]);

  const photosForTypology = useMemo(() => {
    if (!selectedTypology) return [];
    const fromTypology = typologyImages.filter((i) => i.typology === selectedTypology);
    const fromProducts = productImages.filter((i) => i.productCategory && i.productCategory.split(",").map((s) => s.trim()).includes(selectedTypology));
    return [
      ...fromTypology.map((i) => ({ ...i, label: "" })),
      ...fromProducts.map((i) => ({ id: i.id, fileUrl: i.fileUrl, fileName: i.fileName, label: i.productName })),
    ];
  }, [selectedTypology, typologyImages, productImages]);

  // Vista "per prodotto": raggruppa per prodotto
  const productGroups = useMemo(() => {
    const groups: Record<string, { name: string; slug: string; category: string; images: ProductImage[] }> = {};
    for (const img of productImages) {
      if (!img.productId) continue;
      if (!groups[img.productId]) {
        groups[img.productId] = { name: img.productName, slug: img.productSlug, category: img.productCategory, images: [] };
      }
      groups[img.productId].images.push(img);
    }
    let arr = Object.entries(groups).map(([id, g]) => ({ id, ...g }));
    if (productFilterTypology) {
      arr = arr.filter((p) => p.category && p.category.split(",").map((s) => s.trim()).includes(productFilterTypology));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    return arr;
  }, [productImages, search, productFilterTypology]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-warm-200 pb-3 flex-wrap">
        <button
          onClick={() => { setView("typology"); setSelectedTypology(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "typology" ? "bg-warm-800 text-white" : "bg-white text-warm-700 hover:bg-warm-100"
          }`}
        >
          <FolderOpen size={16} /> Per Tipologia
        </button>
        <button
          onClick={() => setView("product")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "product" ? "bg-warm-800 text-white" : "bg-white text-warm-700 hover:bg-warm-100"
          }`}
        >
          <Box size={16} /> Per Prodotto
        </button>
      </div>

      {view === "typology" && !selectedTypology && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {typologies.map((t) => {
            const count = typologyCounts[t.value] || 0;
            return (
              <button
                key={t.value}
                onClick={() => setSelectedTypology(t.value)}
                disabled={count === 0}
                className={`text-left bg-white border p-5 rounded-lg transition-all ${
                  count === 0 ? "opacity-50 cursor-not-allowed border-warm-200" : "border-warm-200 hover:border-warm-800 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-warm-900 uppercase tracking-wider">{t.label}</div>
                    <div className="text-xs text-warm-500 mt-1">{count} {count === 1 ? "foto disponibile" : "foto disponibili"}</div>
                  </div>
                  <FolderOpen size={22} className="text-warm-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === "typology" && selectedTypology && (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedTypology("")}
            className="text-[11px] uppercase tracking-[0.18em] text-warm-700 hover:text-warm-900"
          >
            ← Tutte le tipologie
          </button>
          <h2 className="text-2xl font-serif text-warm-900">{labelMap[selectedTypology] || selectedTypology}</h2>
          {photosForTypology.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">Nessuna foto.</p>
          ) : (
            <Gallery items={photosForTypology} onOpen={setLightbox} />
          )}
        </div>
      )}

      {view === "product" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Cerca prodotto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] max-w-md border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white"
            />
            <select
              value={productFilterTypology}
              onChange={(e) => setProductFilterTypology(e.target.value)}
              className="border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white"
            >
              <option value="">Tutte le tipologie</option>
              {typologies.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {productGroups.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">Nessun prodotto con foto disponibili.</p>
          ) : (
            <div className="space-y-8">
              {productGroups.map((g) => (
                <div key={g.id}>
                  <h3 className="text-lg font-serif text-warm-900 mb-3">{g.name}</h3>
                  <Gallery items={g.images.map((i) => ({ id: i.id, fileUrl: i.fileUrl, fileName: i.fileName, label: "" }))} onOpen={setLightbox} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white hover:text-warm-300">
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}

function Gallery({ items, onOpen }: { items: { id: string; fileUrl: string; fileName: string; label: string }[]; onOpen: (url: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((img) => (
        <div key={img.id} className="relative bg-white border border-warm-200 rounded overflow-hidden group">
          <button onClick={() => onOpen(img.fileUrl)} className="block w-full aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.fileUrl} alt={img.fileName} className="w-full h-full object-cover" />
          </button>
          <a
            href={img.fileUrl}
            download={img.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-1.5 right-1.5 bg-white/95 text-warm-800 p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Scarica"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
          {img.label && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1.5 truncate">
              {img.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
