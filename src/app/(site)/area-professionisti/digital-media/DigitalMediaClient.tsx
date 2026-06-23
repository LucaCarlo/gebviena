"use client";

import { useMemo, useState } from "react";
import { Download, X, FolderOpen, Box, Briefcase } from "lucide-react";

interface TypologyOpt { value: string; label: string }
interface ProductImage { id: string; fileUrl: string; fileName: string; productId: string | null; productName: string; productSlug: string; productCategory: string; productCover?: string | null }
interface ProjectImage { id: string; fileUrl: string; fileName: string; projectId: string; projectName: string; projectSlug: string; projectCover?: string | null }
interface TypologyImage { id: string; fileUrl: string; fileName: string; typology: string }

interface I18nDM {
  byProduct: string;
  byProject: string;
  byTypology: string;
  searchProduct: string;
  searchProject: string;
  allTypologies: string;
  downloadAll: string;
  productsAvailable: string;
  projectsAvailable: string;
  noProducts: string;
  noProjects: string;
  backToTypologies: string;
  noPhotos: string;
  photoAvailable: string;
  photosAvailable: string;
  imagesCount: string;
}

export default function DigitalMediaClient({
  typologies,
  productImages,
  projectImages,
  typologyImages,
  i18n,
}: {
  typologies: TypologyOpt[];
  productImages: ProductImage[];
  projectImages: ProjectImage[];
  typologyImages: TypologyImage[];
  i18n: I18nDM;
}) {
  const [view, setView] = useState<"product" | "project" | "typology">("product");
  const [selectedTypology, setSelectedTypology] = useState<string>("");
  const [productFilterTypology, setProductFilterTypology] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchProject, setSearchProject] = useState("");
  // Modal: gallery di tutte le immagini di un prodotto/progetto
  const [galleryOpen, setGalleryOpen] = useState<{
    title: string;
    images: { id: string; fileUrl: string; fileName: string }[];
  } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of typologies) m[t.value] = t.label;
    return m;
  }, [typologies]);

  /* ---- Per Prodotto: raggruppa immagini per prodotto, costruisce card ---- */
  const productGroups = useMemo(() => {
    const groups: Record<string, { name: string; slug: string; category: string; cover: string; images: { id: string; fileUrl: string; fileName: string }[] }> = {};
    for (const img of productImages) {
      if (!img.productId) continue;
      if (!groups[img.productId]) {
        groups[img.productId] = {
          name: img.productName,
          slug: img.productSlug,
          category: img.productCategory,
          cover: img.productCover || img.fileUrl,
          images: [],
        };
      }
      groups[img.productId].images.push({ id: img.id, fileUrl: img.fileUrl, fileName: img.fileName });
    }
    let arr = Object.entries(groups).map(([id, g]) => ({ id, ...g }));
    if (productFilterTypology) arr = arr.filter((p) => p.category && p.category.split(",").map((s) => s.trim()).includes(productFilterTypology));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    return arr;
  }, [productImages, productFilterTypology, search]);

  /* ---- Per Progetto ---- */
  const projectGroups = useMemo(() => {
    const groups: Record<string, { name: string; slug: string; cover: string; images: { id: string; fileUrl: string; fileName: string }[] }> = {};
    for (const img of projectImages) {
      if (!groups[img.projectId]) {
        groups[img.projectId] = {
          name: img.projectName,
          slug: img.projectSlug,
          cover: img.projectCover || img.fileUrl,
          images: [],
        };
      }
      groups[img.projectId].images.push({ id: img.id, fileUrl: img.fileUrl, fileName: img.fileName });
    }
    let arr = Object.entries(groups).map(([id, g]) => ({ id, ...g }));
    if (searchProject.trim()) {
      const q = searchProject.trim().toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    return arr;
  }, [projectImages, searchProject]);

  /* ---- Per Tipologia ---- */
  const typologyCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of typologies) c[t.value] = 0;
    for (const img of typologyImages) c[img.typology] = (c[img.typology] || 0) + 1;
    for (const img of productImages) {
      if (img.productCategory) {
        const cats = img.productCategory.split(",").map((s) => s.trim());
        for (const cat of cats) if (c[cat] !== undefined) c[cat]++;
      }
    }
    return c;
  }, [typologies, typologyImages, productImages]);

  const photosForTypology = useMemo(() => {
    if (!selectedTypology) return [];
    const fromTypology = typologyImages.filter((i) => i.typology === selectedTypology).map((i) => ({ id: i.id, fileUrl: i.fileUrl, fileName: i.fileName, label: "" }));
    const fromProducts = productImages
      .filter((i) => i.productCategory && i.productCategory.split(",").map((s) => s.trim()).includes(selectedTypology))
      .map((i) => ({ id: i.id, fileUrl: i.fileUrl, fileName: i.fileName, label: i.productName }));
    return [...fromTypology, ...fromProducts];
  }, [selectedTypology, typologyImages, productImages]);

  /* ---- Scarica tutte le immagini del set: scarica sequenziale via anchor click ---- */
  const downloadAll = async (items: { fileUrl: string; fileName: string }[]) => {
    for (const item of items) {
      const a = document.createElement("a");
      a.href = item.fileUrl;
      a.download = item.fileName || "";
      a.rel = "noopener noreferrer";
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-warm-200 pb-3 flex-wrap">
        <Tab active={view === "product"} onClick={() => setView("product")} icon={<Box size={16} />} label={i18n.byProduct} />
        <Tab active={view === "typology"} onClick={() => { setView("typology"); setSelectedTypology(""); }} icon={<FolderOpen size={16} />} label={i18n.byTypology} />
        <Tab active={view === "project"} onClick={() => setView("project")} icon={<Briefcase size={16} />} label={i18n.byProject} />
      </div>

      {view === "product" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder={i18n.searchProduct}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] max-w-md border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white"
            />
            <select
              value={productFilterTypology}
              onChange={(e) => setProductFilterTypology(e.target.value)}
              className="border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white"
            >
              <option value="">{i18n.allTypologies}</option>
              {typologies.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-warm-500">{productGroups.length} {i18n.productsAvailable}</div>
          {productGroups.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">{i18n.noProducts}</p>
          ) : (
            <CardsGrid
              items={productGroups.map((g) => ({ id: g.id, name: g.name, cover: g.cover, count: g.images.length }))}
              onClick={(id) => {
                const g = productGroups.find((p) => p.id === id);
                if (g) setGalleryOpen({ title: g.name, images: g.images });
              }}
            />
          )}
        </div>
      )}

      {view === "project" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder={i18n.searchProject}
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            className="w-full max-w-md border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white"
          />
          <div className="text-xs text-warm-500">{projectGroups.length} {i18n.projectsAvailable}</div>
          {projectGroups.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">{i18n.noProjects}</p>
          ) : (
            <CardsGrid
              items={projectGroups.map((g) => ({ id: g.id, name: g.name, cover: g.cover, count: g.images.length }))}
              onClick={(id) => {
                const g = projectGroups.find((p) => p.id === id);
                if (g) setGalleryOpen({ title: g.name, images: g.images });
              }}
            />
          )}
        </div>
      )}

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
                    <div className="text-xs text-warm-500 mt-1">{count} {count === 1 ? i18n.photoAvailable : i18n.photosAvailable}</div>
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
          <button onClick={() => setSelectedTypology("")} className="text-[11px] uppercase tracking-[0.18em] text-warm-700 hover:text-warm-900">
            {i18n.backToTypologies}
          </button>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-serif text-warm-900">{labelMap[selectedTypology] || selectedTypology}</h2>
            {photosForTypology.length > 0 && (
              <button
                onClick={() => downloadAll(photosForTypology)}
                className="inline-flex items-center gap-2 bg-warm-800 text-white text-[12px] uppercase tracking-[0.12em] px-4 py-2 rounded hover:bg-warm-900"
              >
                <Download size={14} /> {i18n.downloadAll} ({photosForTypology.length})
              </button>
            )}
          </div>
          {photosForTypology.length === 0 ? (
            <p className="text-sm text-warm-500 py-8 text-center">{i18n.noPhotos}</p>
          ) : (
            <Gallery items={photosForTypology} onOpen={setLightbox} />
          )}
        </div>
      )}

      {/* Modal gallery di un prodotto/progetto. z-index sopra al menu fixed
          del sito (header usa z-50) per non rimanere nascosto sotto. */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setGalleryOpen(null)}>
          <div className="bg-warm-50 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-warm-200">
              <div>
                <h3 className="text-xl font-serif text-warm-900">{galleryOpen.title}</h3>
                <p className="text-xs text-warm-500 mt-0.5">{galleryOpen.images.length} {i18n.imagesCount}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadAll(galleryOpen.images)}
                  className="inline-flex items-center gap-2 bg-warm-800 text-white text-[12px] uppercase tracking-[0.12em] px-4 py-2 rounded hover:bg-warm-900"
                >
                  <Download size={14} /> {i18n.downloadAll}
                </button>
                <button onClick={() => setGalleryOpen(null)} className="p-1.5 text-warm-500 hover:text-warm-800">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <Gallery items={galleryOpen.images.map((i) => ({ ...i, label: "" }))} onOpen={setLightbox} />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox: ingrandimento singola immagine — z-index sopra alla modal */}
      {lightbox && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
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

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        active ? "bg-warm-800 text-white" : "bg-white text-warm-700 hover:bg-warm-100"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function CardsGrid({ items, onClick }: { items: { id: string; name: string; cover: string; count: number }[]; onClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onClick(it.id)}
          className="text-left bg-white border border-warm-200 rounded-lg overflow-hidden hover:border-warm-800 hover:shadow-sm transition-all group"
        >
          <div className="relative aspect-square bg-warm-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.cover} alt={it.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
            <span className="absolute top-2 right-2 bg-warm-900/90 text-white text-[11px] font-medium px-2 py-0.5 rounded">{it.count}</span>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-medium text-warm-900 leading-snug line-clamp-2 min-h-[2.6em]">{it.name}</h3>
          </div>
        </button>
      ))}
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
