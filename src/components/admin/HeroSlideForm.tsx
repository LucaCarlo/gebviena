"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HERO_POSITIONS, HERO_VERTICAL_POSITIONS, HERO_PAGES } from "@/lib/constants";
import ImageUploadField from "./ImageUploadField";

interface HeroSlideFormProps {
  slideId?: string;
}

export default function HeroSlideForm({ slideId }: HeroSlideFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    imageUrl: "",
    coverImage: "",
    videoUrl: "",
    position: "center",
    verticalPosition: "center",
    darkOverlay: false,
    overlayOpacity: 60,
    page: "homepage",
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
        coverImage: s.coverImage || "",
        videoUrl: s.videoUrl || "",
        position: s.position || "center",
        verticalPosition: s.verticalPosition || "center",
        darkOverlay: s.darkOverlay ?? false,
        overlayOpacity: s.overlayOpacity ?? 60,
        page: s.page || "homepage",
        isActive: s.isActive ?? true,
        sortOrder: s.sortOrder || 0,
      });
    }
  }, [slideId]);

  useEffect(() => { loadSlide(); }, [loadSlide]);

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
        {/* Page selector */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Pagina
          </label>
          <select
            value={form.page}
            onChange={(e) => updateField("page", e.target.value)}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          >
            {HERO_PAGES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
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

        {/* Image upload using ImageUploadField */}
        <ImageUploadField
          label="Immagine Hero"
          value={form.imageUrl}
          onChange={(url) => updateField("imageUrl", url)}
          onRemove={() => updateField("imageUrl", "")}
          purpose="hero"
          folder="hero"
          helpText="Immagine di sfondo per lo slide hero"
        />

        <ImageUploadField
          label="Immagine di copertina (card)"
          value={form.coverImage}
          onChange={(url) => updateField("coverImage", url)}
          onRemove={() => updateField("coverImage", "")}
          purpose="hero"
          folder="hero"
          helpText="Immagine ridotta usata come card nella sezione 'Potrebbe interessarti anche'"
          recommendedSize="800x500px"
        />

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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Posizione Orizzontale
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
              Posizione Verticale
            </label>
            <select
              value={form.verticalPosition}
              onChange={(e) => updateField("verticalPosition", e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            >
              {HERO_VERTICAL_POSITIONS.map((p) => (
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

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="darkOverlay"
                checked={form.darkOverlay}
                onChange={(e) => updateField("darkOverlay", e.target.checked)}
                className="rounded border-warm-300"
              />
              <label htmlFor="darkOverlay" className="text-sm text-warm-600">
                Oscura immagine
              </label>
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
          {form.darkOverlay && (
            <div className="flex items-center gap-3 pl-6">
              <label className="text-xs text-warm-500 whitespace-nowrap">Opacita overlay</label>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={form.overlayOpacity}
                onChange={(e) => updateField("overlayOpacity", parseInt(e.target.value))}
                className="flex-1 accent-warm-800"
              />
              <span className="text-xs text-warm-600 font-medium w-10 text-right">{form.overlayOpacity}%</span>
            </div>
          )}
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
