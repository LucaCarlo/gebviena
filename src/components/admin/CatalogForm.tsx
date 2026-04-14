"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, FileText } from "lucide-react";
import { slugify } from "@/lib/utils";

interface CatalogFormProps {
  catalogId?: string;
}

const SECTIONS = [
  { value: "cataloghi", label: "Cataloghi" },
  { value: "slow-living", label: "Slow Living Magazine" },
];

export default function CatalogForm({ catalogId }: CatalogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    section: "cataloghi",
    pretitle: "",
    title: "",
    description: "",
    imageUrl: "",
    pdfUrl: "",
    linkText: "",
    sortOrder: 0,
    isActive: true,
  });

  const loadCatalog = useCallback(async () => {
    if (!catalogId) return;
    const res = await fetch(`/api/catalogs/${catalogId}`);
    const data = await res.json();
    if (data.success) {
      const c = data.data;
      setForm({
        name: c.name,
        slug: c.slug,
        section: c.section || "cataloghi",
        pretitle: c.pretitle || "",
        title: c.title || "",
        description: c.description || "",
        imageUrl: c.imageUrl || "",
        pdfUrl: c.pdfUrl || "",
        linkText: c.linkText || "",
        sortOrder: c.sortOrder || 0,
        isActive: c.isActive,
      });
    }
  }, [catalogId]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: catalogId ? prev.slug : slugify(name),
    }));
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
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
      setUploadingImage(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipCompression", "true");
    formData.append("folder", "catalogs");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, pdfUrl: data.data.url }));
      }
    } catch {
      // silent
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = catalogId ? `/api/catalogs/${catalogId}` : "/api/catalogs";
      const method = catalogId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/catalogs");
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
            Nome (interno) *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Sezione *
            </label>
            <select
              value={form.section}
              onChange={(e) => updateField("section", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Ordine
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => updateField("sortOrder", parseInt(e.target.value) || 0)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Pre-titolo
          </label>
          <input
            type="text"
            value={form.pretitle}
            onChange={(e) => updateField("pretitle", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="es. Slow Living Magazine | Issue N° 2"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Titolo
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="es. Interno Marche"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Descrizione
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Immagine copertina
          </label>
          <div className="flex items-start gap-4">
            {form.imageUrl && (
              <div className="w-24 h-32 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                <Image src={form.imageUrl} alt="Preview" fill className="object-cover" sizes="96px" />
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-warm-300 rounded cursor-pointer hover:border-warm-500 transition-colors">
                <Upload size={16} className="text-warm-400" />
                <span className="text-sm text-warm-500">{uploadingImage ? "Caricamento..." : "Carica immagine"}</span>
                <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
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

        {/* PDF upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            File PDF (scaricabile)
          </label>
          <div className="flex items-start gap-4">
            {form.pdfUrl && (
              <div className="w-24 h-24 rounded bg-warm-100 flex-shrink-0 flex flex-col items-center justify-center gap-1">
                <FileText size={24} className="text-warm-500" />
                <span className="text-[10px] text-warm-500 truncate max-w-[80px]">PDF</span>
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-warm-300 rounded cursor-pointer hover:border-warm-500 transition-colors">
                <Upload size={16} className="text-warm-400" />
                <span className="text-sm text-warm-500">{uploadingPdf ? "Caricamento..." : "Carica PDF"}</span>
                <input type="file" accept=".pdf,application/pdf" onChange={handleUploadPdf} className="hidden" />
              </label>
              <p className="text-xs text-warm-400 mt-1">oppure inserisci URL:</p>
              <input
                type="text"
                value={form.pdfUrl}
                onChange={(e) => updateField("pdfUrl", e.target.value)}
                className="w-full mt-1 border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Link text */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Testo pulsante scarica
          </label>
          <input
            type="text"
            value={form.linkText}
            onChange={(e) => updateField("linkText", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="es. Scarica il catalogo 2025"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-warm-200 peer-focus:outline-none rounded-full peer peer-checked:bg-warm-800 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm text-warm-600">Attivo</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : catalogId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/catalogs")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
