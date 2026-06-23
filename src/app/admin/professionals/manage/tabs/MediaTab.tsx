"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Trash2, X, FolderOpen, Box, Briefcase, EyeOff, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

/** Foto area professionisti — separate dalle immagini-prodotto del sito.
 *  Si organizzano per Tipologia (foto generiche di categoria) o per Prodotto
 *  (foto specifiche di un singolo prodotto). */
interface ProfessionalImage {
  id: string;
  productId: string | null;
  typology: string | null;
  projectId: string | null;
  fileUrl: string;
  fileName: string;
  storage: string;
  sortOrder: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  imageUrl?: string;
  coverImage?: string | null;
  heroImage?: string | null;
  sideImage?: string | null;
  galleryUrls?: string | null;
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
  heroImage?: string | null;
  sideImage?: string | null;
  galleryImages?: string | null;
}

interface CatalogImage {
  url: string;
  fileName: string;
}

/** Estrae tutti gli URL immagine dal Product (cover, hero, side, galleria) per
 *  mostrarli nella modal admin insieme alle foto pro caricate. */
function extractProductCatalog(p: Product | null | undefined): CatalogImage[] {
  if (!p) return [];
  const urls = new Set<string>();
  if (p.coverImage) urls.add(p.coverImage);
  if (p.imageUrl) urls.add(p.imageUrl);
  if (p.heroImage) urls.add(p.heroImage);
  if (p.sideImage) urls.add(p.sideImage);
  if (p.galleryImages) {
    try {
      const arr = JSON.parse(p.galleryImages);
      if (Array.isArray(arr)) for (const u of arr) if (typeof u === "string" && u) urls.add(u);
    } catch { /* silent */ }
  }
  return Array.from(urls).map((u) => ({ url: u, fileName: u.split("/").pop() || "image" }));
}

function extractProjectCatalog(p: Project | null | undefined): CatalogImage[] {
  if (!p) return [];
  const urls = new Set<string>();
  if (p.coverImage) urls.add(p.coverImage);
  if (p.imageUrl) urls.add(p.imageUrl);
  if (p.heroImage) urls.add(p.heroImage);
  if (p.sideImage) urls.add(p.sideImage);
  if (p.galleryUrls) {
    try {
      const arr = JSON.parse(p.galleryUrls);
      if (Array.isArray(arr)) for (const u of arr) if (typeof u === "string" && u) urls.add(u);
    } catch { /* silent */ }
  }
  return Array.from(urls).map((u) => ({ url: u, fileName: u.split("/").pop() || "image" }));
}

type View = "product" | "project" | "typology";

export default function MediaTab() {
  const [view, setView] = useState<View>("product");
  const [typologies, setTypologies] = useState<Typology[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [typologyCounts, setTypologyCounts] = useState<Record<string, number>>({});
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  // Set di URL scartati globalmente (per Product e per Project) — usati per
  // ridurre il count visibile nella grid card senza doverli aprire.
  const [hiddenByProduct, setHiddenByProduct] = useState<Record<string, Set<string>>>({});
  const [hiddenByProject, setHiddenByProject] = useState<Record<string, Set<string>>>({});

  // Modal state — un'unica modal usata per typology/product/project
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"typology" | "product" | "project">("typology");
  const [modalValue, setModalValue] = useState<string>("");
  const [modalLabel, setModalLabel] = useState<string>("");
  const [modalImages, setModalImages] = useState<ProfessionalImage[]>([]);
  // Immagini "del catalogo" (cover/gallery/hero del Product o Project) —
  // visualizzate insieme alle foto pro caricate via dashboard. L'admin puo
  // nasconderle dall'area pro senza intaccare le immagini del prodotto/progetto
  // nel sito principale (gestite tramite ProfessionalCatalogHidden).
  const [modalCatalog, setModalCatalog] = useState<CatalogImage[]>([]);
  // Map fileUrl -> hiddenId (presente = nascosto). Il bottone cambia comportamento.
  const [hiddenMap, setHiddenMap] = useState<Record<string, string>>({});
  // Toggle: mostra la sezione "Immagini scartate (recupera dal catalogo)"
  const [showHidden, setShowHidden] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Filtri vista "per prodotto"
  const [search, setSearch] = useState("");
  const [filterTypology, setFilterTypology] = useState<string>("");
  // Filtro vista "per progetto"
  const [searchProject, setSearchProject] = useState("");

  // Carica tipologie + prodotti + summary counters
  const loadAll = useCallback(async () => {
    try {
      const [tRes, pRes, prRes, tSum, pSum, prSum, hidRes] = await Promise.all([
        fetch("/api/typologies?contentType=products").then((r) => r.json()),
        fetch("/api/products?limit=500&admin=true").then((r) => r.json()),
        fetch("/api/projects?limit=500&admin=true").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/admin/professional-images?summary=typology").then((r) => r.json()),
        fetch("/api/admin/professional-images?summary=product").then((r) => r.json()),
        fetch("/api/admin/professional-images?summary=project").then((r) => r.json()),
        fetch("/api/admin/professional-catalog-hidden").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);
      setTypologies(tRes.data || []);
      setProducts(pRes.data || []);
      setProjects(prRes.data || []);
      const tc: Record<string, number> = {};
      for (const x of tSum.data || []) tc[x.typology] = x.count;
      setTypologyCounts(tc);
      const pc: Record<string, number> = {};
      for (const x of pSum.data || []) pc[x.productId] = x.count;
      setProductCounts(pc);
      const prc: Record<string, number> = {};
      for (const x of prSum.data || []) prc[x.projectId] = x.count;
      setProjectCounts(prc);
      // Mappa hidden urls per product/project
      const hbp: Record<string, Set<string>> = {};
      const hbpr: Record<string, Set<string>> = {};
      for (const h of hidRes.data || []) {
        if (h.productId) {
          if (!hbp[h.productId]) hbp[h.productId] = new Set();
          hbp[h.productId].add(h.fileUrl);
        }
        if (h.projectId) {
          if (!hbpr[h.projectId]) hbpr[h.projectId] = new Set();
          hbpr[h.projectId].add(h.fileUrl);
        }
      }
      setHiddenByProduct(hbp);
      setHiddenByProject(hbpr);
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
    setModalCatalog([]);
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
    setModalCatalog(extractProductCatalog(p));
    setHiddenMap({});
    setShowHidden(false);
    setModalOpen(true);
    const [imgRes, hidRes] = await Promise.all([
      fetch(`/api/admin/professional-images?productId=${encodeURIComponent(p.id)}`).then((r) => r.json()),
      fetch(`/api/admin/professional-catalog-hidden?productId=${encodeURIComponent(p.id)}`).then((r) => r.json()),
    ]);
    setModalImages(imgRes.data || []);
    const map: Record<string, string> = {};
    for (const h of hidRes.data || []) map[h.fileUrl] = h.id;
    setHiddenMap(map);
  };

  const openProject = async (p: Project) => {
    setModalKind("project");
    setModalValue(p.id);
    setModalLabel(p.name + (p.city ? ` — ${p.city}` : ""));
    setModalImages([]);
    setModalCatalog(extractProjectCatalog(p));
    setHiddenMap({});
    setShowHidden(false);
    setModalOpen(true);
    const [imgRes, hidRes] = await Promise.all([
      fetch(`/api/admin/professional-images?projectId=${encodeURIComponent(p.id)}`).then((r) => r.json()),
      fetch(`/api/admin/professional-catalog-hidden?projectId=${encodeURIComponent(p.id)}`).then((r) => r.json()),
    ]);
    setModalImages(imgRes.data || []);
    const map: Record<string, string> = {};
    for (const h of hidRes.data || []) map[h.fileUrl] = h.id;
    setHiddenMap(map);
  };

  const toggleCatalogHidden = async (fileUrl: string) => {
    const existingId = hiddenMap[fileUrl];
    if (existingId) {
      // Ripristina
      const r = await fetch(`/api/admin/professional-catalog-hidden/${existingId}`, { method: "DELETE" });
      const j = await r.json();
      if (j.success) {
        setHiddenMap((prev) => {
          const next = { ...prev };
          delete next[fileUrl];
          return next;
        });
        if (modalKind === "product") {
          setHiddenByProduct((prev) => {
            const next = { ...prev };
            const s = new Set(next[modalValue] || []);
            s.delete(fileUrl);
            next[modalValue] = s;
            return next;
          });
        } else if (modalKind === "project") {
          setHiddenByProject((prev) => {
            const next = { ...prev };
            const s = new Set(next[modalValue] || []);
            s.delete(fileUrl);
            next[modalValue] = s;
            return next;
          });
        }
      }
    } else {
      // Nascondi
      const body: { fileUrl: string; productId?: string; projectId?: string } = { fileUrl };
      if (modalKind === "product") body.productId = modalValue;
      else if (modalKind === "project") body.projectId = modalValue;
      const r = await fetch("/api/admin/professional-catalog-hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.success && j.data) {
        setHiddenMap((prev) => ({ ...prev, [fileUrl]: j.data.id }));
        if (modalKind === "product") {
          setHiddenByProduct((prev) => {
            const next = { ...prev };
            const s = new Set(next[modalValue] || []);
            s.add(fileUrl);
            next[modalValue] = s;
            return next;
          });
        } else if (modalKind === "project") {
          setHiddenByProject((prev) => {
            const next = { ...prev };
            const s = new Set(next[modalValue] || []);
            s.add(fileUrl);
            next[modalValue] = s;
            return next;
          });
        }
      }
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setUploading(true);
    try {
      // Step 1: carica i file via /api/upload (compressione automatica + WebP +
      // registrazione in MediaFile globale). Cosi le foto pro appaiono anche
      // in /admin/media insieme a tutti gli altri media del sito.
      const subfolder =
        modalKind === "typology" ? `tip-${modalValue}` :
        modalKind === "project" ? `proj-${modalValue}` :
        `prod-${modalValue}`;
      const folder = `professionals/${subfolder}`;
      const items: { fileUrl: string; fileName: string; size?: number; width?: number; height?: number }[] = [];
      for (const f of arr) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("folder", folder);
        fd.append("purpose", "general");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (j.success) {
          items.push({
            fileUrl: j.data.url,
            fileName: f.name,
            size: j.data.size,
            width: j.data.width,
            height: j.data.height,
          });
        } else {
          alert(`Errore caricamento di ${f.name}: ${j.error || "?"}`);
        }
      }
      if (items.length === 0) return;

      // Step 2: crea il link ProfessionalImage per ogni file
      const body: { productId?: string; typology?: string; projectId?: string; items: typeof items } = { items };
      if (modalKind === "typology") body.typology = modalValue;
      else if (modalKind === "project") body.projectId = modalValue;
      else body.productId = modalValue;

      const r2 = await fetch("/api/admin/professional-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j2 = await r2.json();
      if (j2.success) {
        setModalImages((prev) => [...prev, ...j2.data]);
        if (modalKind === "typology") {
          setTypologyCounts((prev) => ({ ...prev, [modalValue]: (prev[modalValue] || 0) + j2.data.length }));
        } else if (modalKind === "project") {
          setProjectCounts((prev) => ({ ...prev, [modalValue]: (prev[modalValue] || 0) + j2.data.length }));
        } else {
          setProductCounts((prev) => ({ ...prev, [modalValue]: (prev[modalValue] || 0) + j2.data.length }));
        }
      } else {
        alert("Errore: " + (j2.error || "?"));
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
      } else if (modalKind === "project") {
        setProjectCounts((prev) => ({ ...prev, [modalValue]: Math.max(0, (prev[modalValue] || 1) - 1) }));
      } else {
        setProductCounts((prev) => ({ ...prev, [modalValue]: Math.max(0, (prev[modalValue] || 1) - 1) }));
      }
    }
  };

  const filteredProjects = useMemo(() => {
    if (!searchProject.trim()) return projects;
    const q = searchProject.trim().toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q));
  }, [projects, searchProject]);

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
      <div className="flex gap-2 border-b border-warm-200 pb-3 flex-wrap">
        <button
          onClick={() => setView("product")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "product" ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-100"
          }`}
        >
          <Box size={16} /> Per Prodotto
        </button>
        <button
          onClick={() => setView("typology")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "typology" ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-100"
          }`}
        >
          <FolderOpen size={16} /> Per Tipologia
        </button>
        <button
          onClick={() => setView("project")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            view === "project" ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-100"
          }`}
        >
          <Briefcase size={16} /> Per Progetto
        </button>
      </div>

      <p className="text-sm text-warm-600">
        Foto dedicate all&apos;area professionisti — <strong>separate</strong> dalle immagini-prodotto del sito. Possono essere caricate per <em>tipologia</em> (foto generiche di categoria, es. ambientazioni o ispirazioni) o per <em>prodotto</em> (foto specifiche di un singolo articolo).
      </p>

      {view === "project" && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Cerca progetto…"
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            className="w-full max-w-md border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
          />
          <div className="text-xs text-warm-500">{filteredProjects.length} progetti</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProjects.map((p) => {
              const proCount = projectCounts[p.id] || 0;
              const allCatalog = extractProjectCatalog(p);
              const hiddenSet = hiddenByProject[p.id] || new Set<string>();
              const visibleCatalogCount = allCatalog.filter((c) => !hiddenSet.has(c.url)).length;
              const total = proCount + visibleCatalogCount;
              const thumb = p.coverImage || p.imageUrl;
              return (
                <button
                  key={p.id}
                  onClick={() => openProject(p)}
                  className="bg-white border border-warm-200 rounded-lg p-2 text-left hover:border-warm-800 hover:shadow-sm transition-all"
                >
                  <div className="relative w-full aspect-square bg-warm-50 rounded overflow-hidden mb-2">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                    )}
                    {total > 0 && (
                      <span className="absolute top-1 right-1 bg-warm-800 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">{total}</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-warm-800 truncate">{p.name}</div>
                  {p.city && <div className="text-[10px] text-warm-500 truncate">{p.city}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              const proCount = productCounts[p.id] || 0;
              const allCatalog = extractProductCatalog(p);
              const hiddenSet = hiddenByProduct[p.id] || new Set<string>();
              const visibleCatalogCount = allCatalog.filter((c) => !hiddenSet.has(c.url)).length;
              const total = proCount + visibleCatalogCount;
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
                    {total > 0 && (
                      <span className="absolute top-1 right-1 bg-warm-800 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">{total}</span>
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
                  {modalKind === "typology" ? "Tipologia" : modalKind === "project" ? "Progetto" : "Prodotto"}
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

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
              {/* Foto pro caricate via dashboard (eliminabili) */}
              {modalImages.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-2">
                    Foto caricate ({modalImages.length})
                  </div>
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
                </div>
              )}

              {/* Immagini dal catalogo Product/Project — visibili nell'area
                  pro. L'admin puo scartarle: spariscono da qui e finiscono
                  nella sezione "Recupera dal catalogo" in basso. */}
              {(modalKind === "product" || modalKind === "project") && (() => {
                const visibleCatalog = modalCatalog.filter((img) => !hiddenMap[img.url]);
                const hiddenCatalog = modalCatalog.filter((img) => hiddenMap[img.url]);
                return (
                  <>
                    {visibleCatalog.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500 mb-2 flex items-center gap-2 flex-wrap">
                          Dal catalogo {modalKind === "project" ? "progetto" : "prodotto"} ({visibleCatalog.length})
                          <span className="text-[10px] text-warm-400 normal-case tracking-normal">
                            — clicca <EyeOff size={10} className="inline" /> per non mostrarla nell&apos;area pro (l&apos;immagine resta sul sito)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {visibleCatalog.map((img, i) => (
                            <div key={i} className="relative bg-warm-50 rounded overflow-hidden border border-warm-200 group">
                              <div className="aspect-square">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                              </div>
                              <span className="absolute top-1 left-1 bg-warm-800/85 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                Catalogo
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleCatalogHidden(img.url)}
                                title="Scarta: non mostrare nell'area pro"
                                className="absolute top-1 right-1 p-1 rounded shadow-sm bg-white/95 text-warm-700 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <EyeOff size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {hiddenCatalog.length > 0 && (
                      <div className="border-t border-warm-200 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowHidden((v) => !v)}
                          className="w-full flex items-center justify-between text-left text-[11px] uppercase tracking-[0.15em] text-warm-600 hover:text-warm-900 mb-2"
                        >
                          <span className="flex items-center gap-2">
                            <RotateCcw size={12} />
                            Recupera dal catalogo ({hiddenCatalog.length} immagini scartate)
                          </span>
                          {showHidden ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showHidden && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {hiddenCatalog.map((img, i) => (
                              <div key={i} className="relative bg-warm-50 rounded overflow-hidden border border-amber-300 group">
                                <div className="aspect-square">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                                </div>
                                <span className="absolute top-1 left-1 bg-amber-600/90 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                  Scartata
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleCatalogHidden(img.url)}
                                  title="Ripristina: torna visibile nell'area pro"
                                  className="absolute bottom-1 right-1 left-1 inline-flex items-center justify-center gap-1 bg-warm-800 text-white text-[10px] uppercase tracking-wider py-1.5 rounded hover:bg-warm-900"
                                >
                                  <RotateCcw size={11} /> Recupera
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {modalImages.length === 0 && modalCatalog.length === 0 && (
                <p className="text-sm text-warm-500 text-center py-8">Nessuna foto.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

