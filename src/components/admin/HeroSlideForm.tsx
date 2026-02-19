"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload } from "lucide-react";
import { HERO_POSITIONS } from "@/lib/constants";

interface HeroSlideFormProps {
  slideId?: string;
}

export default function HeroSlideForm({ slideId }: HeroSlideFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    imageUrl: "",
    videoUrl: "",
    position: "center",
    isActive: true,
    sortOrder: 0,
  });

  const loadSlide = useCallback(async () => {
    if (!slideId) return;
    const res = await fetch(`/api/hero-slides/${slideId}`);
    const data = await res.json();
    if (data.success) {
      const s = data.data;
      setForm({
        title: s.title || "",
        subtitle: s.subtitle || "",
        ctaText: s.ctaText || "",
        ctaLink: s.ctaLink || "",
        imageUrl: s.imageUrl || "",
        videoUrl: s.videoUrl || "",
        position: s.position || "center",
        isActive: s.isActive ?? true,
        sortOrder: s.sortOrder || 0,
      });
    }
  }, [slideId]);

  useEffect(() => { loadSlide(); }, [loadSlide]);

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
      const url = slideId ? `/api/hero-slides/${slideId}` : "/api/hero-slides";
      const method = slideId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin/hero");
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
            Titolo
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Sottotitolo
          </label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => updateField("subtitle", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Testo CTA
            </label>
            <input
              type="text"
              value={form.ctaText}
              onChange={(e) => updateField("ctaText", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="Scopri di più"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Link CTA
            </label>
            <input
              type="text"
              value={form.ctaLink}
              onChange={(e) => updateField("ctaLink", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              placeholder="/prodotti"
            />
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Immagine
          </label>
          <div className="flex items-start gap-4">
            {form.imageUrl && (
              <div className="w-32 h-20 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                <Image src={form.imageUrl} alt="Preview" fill className="object-cover" sizes="128px" />
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
            URL Video
          </label>
          <input
            type="text"
            value={form.videoUrl}
            onChange={(e) => updateField("videoUrl", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            placeholder="https://youtube.com/..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Posizione Testo
            </label>
            <select
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              {HERO_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => updateField("isActive", e.target.checked)}
            className="rounded border-warm-300"
          />
          <label htmlFor="isActive" className="text-sm text-warm-600">
            Slide attiva
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvataggio..." : slideId ? "Aggiorna" : "Crea"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/hero")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
