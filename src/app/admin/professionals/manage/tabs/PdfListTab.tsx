"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileText, Trash2, Loader2, ExternalLink, Eye, EyeOff, Image as ImageIcon } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  pdfUrl: string;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 191) || `pdf-${Date.now()}`;
}

export default function PdfListTab({
  section, title, description, embedded = false,
}: { section: string; title: string; description: string; embedded?: boolean }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingPreviewId, setUploadingPreviewId] = useState<string | null>(null);
  const previewInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadPreview = async (it: CatalogItem, file: File) => {
    setUploadingPreviewId(it.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "catalogs");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!upData.success || !upData.data?.url) {
        alert(upData?.error || "Upload anteprima fallito");
        return;
      }
      const res = await fetch(`/api/catalogs/${it.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: upData.data.url }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data?.error || "Errore aggiornamento anteprima");
        return;
      }
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, imageUrl: upData.data.url } : x));
    } finally {
      setUploadingPreviewId(null);
      const inp = previewInputRefs.current[it.id];
      if (inp) inp.value = "";
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/catalogs?admin=true&section=${encodeURIComponent(section)}`, { cache: "no-store" });
      const j = await r.json();
      if (j.success) setItems(j.data || []);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 1. Upload del PDF
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "catalogs");
      fd.append("skipCompression", "true");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!upData.success || !upData.data?.url) {
        alert(upData?.error || "Upload PDF fallito");
        return;
      }
      // 2. Crea il record Catalog
      const name = file.name.replace(/\.pdf$/i, "");
      const slug = `${section}-${slugify(name)}`;
      const create = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, section, pdfUrl: upData.data.url,
          isActive: true,
          sortOrder: items.length,
        }),
      });
      const data = await create.json();
      if (!data.success) {
        alert(data?.error || "Errore nella creazione del record");
        return;
      }
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const togglePublish = async (it: CatalogItem) => {
    const next = !it.isActive;
    setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, isActive: next } : x));
    try {
      await fetch(`/api/catalogs/${it.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
    } catch {
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, isActive: it.isActive } : x));
    }
  };

  const remove = async (it: CatalogItem) => {
    if (!confirm(`Eliminare "${it.name}"?`)) return;
    setDeletingId(it.id);
    try {
      const r = await fetch(`/api/catalogs/${it.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) setItems((prev) => prev.filter((x) => x.id !== it.id));
      else alert(d.error || "Errore");
    } finally {
      setDeletingId(null);
    }
  };

  const Wrap = embedded ? "div" : "div";
  return (
    <Wrap>
      {!embedded && (
        <>
          <h3 className="text-base font-medium text-warm-800 mb-1">{title}</h3>
          <p className="text-xs text-warm-500 mb-4">{description}</p>
        </>
      )}
      {embedded && (
        <>
          <div className="text-sm font-medium text-warm-800 mb-1">{title}</div>
          <p className="text-xs text-warm-500 mb-3">{description}</p>
        </>
      )}

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="text-xs text-warm-500">
          {loading ? "Caricamento…" : `${items.length} ${items.length === 1 ? "documento" : "documenti"}`}
        </div>
        <label className="inline-flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 cursor-pointer">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Caricamento…" : "Carica PDF"}
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-14 bg-warm-50 border border-warm-200 rounded animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-warm-500 bg-warm-50 border border-warm-200 rounded text-sm">
          Nessun PDF caricato. Carica il primo documento con il pulsante qui sopra.
        </div>
      ) : (
        <div className="bg-white border border-warm-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-warm-100">
            {items.map((it) => (
              <div key={it.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${!it.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Thumbnail anteprima o icona PDF di default */}
                  <div className="relative w-14 h-14 flex-shrink-0 bg-warm-50 border border-warm-200 rounded overflow-hidden">
                    {it.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={it.imageUrl} alt="anteprima" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText size={22} className="text-warm-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-warm-900 truncate">{it.name}</div>
                    <a href={it.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-warm-500 hover:text-warm-800 hover:underline inline-flex items-center gap-1 truncate">
                      <ExternalLink size={10} /> {it.pdfUrl.split("/").pop()}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Upload anteprima */}
                  <label
                    title={it.imageUrl ? "Sostituisci l'anteprima" : "Carica un'immagine di anteprima"}
                    className="p-1.5 text-warm-400 hover:text-warm-800 rounded cursor-pointer"
                  >
                    {uploadingPreviewId === it.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <ImageIcon size={16} />}
                    <input
                      ref={(el) => { previewInputRefs.current[it.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPreviewId === it.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPreview(it, f);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => togglePublish(it)}
                    title={it.isActive ? "Visibile sul sito — clicca per nascondere" : "Nascosto — clicca per pubblicare"}
                    className="p-1.5 text-warm-400 hover:text-warm-800 rounded"
                  >
                    {it.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => remove(it)}
                    disabled={deletingId === it.id}
                    className="p-1.5 text-warm-400 hover:text-red-600 rounded disabled:opacity-50"
                    title="Elimina"
                  >
                    {deletingId === it.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Wrap>
  );
}
