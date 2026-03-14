"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Save,
  Check,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Image as LucideImage,
  Images,
} from "lucide-react";
import { HERO_PAGES, PAGE_IMAGES_CONFIG } from "@/lib/constants";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { HeroSlide, PageImage } from "@/types";

/* ── Build unified list of all pages ── */
const ALL_PAGES: { value: string; label: string; hasHero: boolean; hasImages: boolean }[] = (() => {
  const map = new Map<string, { label: string; hasHero: boolean; hasImages: boolean }>();

  for (const hp of HERO_PAGES) {
    map.set(hp.value, { label: hp.label, hasHero: true, hasImages: false });
  }

  for (const pic of PAGE_IMAGES_CONFIG) {
    const existing = map.get(pic.page);
    if (existing) {
      existing.hasImages = true;
    } else {
      map.set(pic.page, { label: pic.label, hasHero: false, hasImages: true });
    }
  }

  return Array.from(map.entries()).map(([value, data]) => ({ value, ...data }));
})();

export default function GestioneImmaginiPage() {
  /* ── State ── */
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [images, setImages] = useState<PageImage[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── Fetch data ── */
  const fetchSlides = useCallback(async () => {
    try {
      const res = await fetch("/api/hero-slides?all=1");
      const data = await res.json();
      setSlides(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingSlides(false);
    }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/page-images");
      const data = await res.json();
      if (data.success) setImages(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
    fetchImages();
  }, [fetchSlides, fetchImages]);

  /* ── Hero slide actions ── */
  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo slide?")) return;
    await fetch(`/api/hero-slides/${id}`, { method: "DELETE" });
    fetchSlides();
  };

  /* ── Page images helpers ── */
  const getImageUrl = (page: string, section: string, defaultUrl: string) => {
    const key = `${page}:${section}`;
    if (key in edits) return edits[key];
    const existing = images.find((i) => i.page === page && i.section === section);
    return existing?.imageUrl || defaultUrl;
  };

  const handleImageChange = (page: string, section: string, url: string) => {
    setEdits((prev) => ({ ...prev, [`${page}:${section}`]: url }));
    setDirty(true);
    setSaved(false);
  };

  const handleImageRemove = (page: string, section: string, defaultUrl: string) => {
    handleImageChange(page, section, defaultUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const imagesToSave: { page: string; section: string; label: string; imageUrl: string; sortOrder: number }[] = [];
    for (const pageConfig of PAGE_IMAGES_CONFIG) {
      for (let idx = 0; idx < pageConfig.images.length; idx++) {
        const imgConfig = pageConfig.images[idx];
        const url = getImageUrl(pageConfig.page, imgConfig.section, imgConfig.defaultUrl);
        imagesToSave.push({
          page: pageConfig.page,
          section: imgConfig.section,
          label: imgConfig.label,
          imageUrl: url,
          sortOrder: idx,
        });
      }
    }

    try {
      const res = await fetch("/api/page-images/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesToSave }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setDirty(false);
        setEdits({});
        await fetchImages();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleInitialize = async () => {
    setSaving(true);
    const imagesToSave: { page: string; section: string; label: string; imageUrl: string; sortOrder: number }[] = [];
    for (const pageConfig of PAGE_IMAGES_CONFIG) {
      for (let idx = 0; idx < pageConfig.images.length; idx++) {
        const imgConfig = pageConfig.images[idx];
        imagesToSave.push({
          page: pageConfig.page,
          section: imgConfig.section,
          label: imgConfig.label,
          imageUrl: imgConfig.defaultUrl,
          sortOrder: idx,
        });
      }
    }
    try {
      const res = await fetch("/api/page-images/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesToSave }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchImages();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert("Errore durante l'inizializzazione");
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (page: string) => {
    setExpanded((prev) => ({ ...prev, [page]: !prev[page] }));
  };

  /* ── Loading ── */
  const loading = loadingSlides || loadingImages;
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-warm-400 py-12">
        <Loader2 size={18} className="animate-spin" /> Caricamento...
      </div>
    );
  }

  const hasImageData = images.length > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Gestione Immagini</h1>
          <p className="text-sm text-warm-500 mt-1">
            Hero slides e immagini di pagina per tutto il sito
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasImageData && (
            <button
              onClick={handleInitialize}
              disabled={saving}
              className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors disabled:opacity-50"
            >
              Inizializza con immagini di default
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (!dirty && hasImageData)}
            className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva immagini"}
          </button>
        </div>
      </div>

      {/* ── Pages list ── */}
      <div className="space-y-3">
        {ALL_PAGES.map((page) => {
          const isOpen = expanded[page.value] ?? false;
          const pageSlides = slides.filter((s) => s.page === page.value);
          const pageConfig = PAGE_IMAGES_CONFIG.find((c) => c.page === page.value);
          const imageCount = pageConfig?.images.length || 0;
          const savedImageCount = images.filter((i) => i.page === page.value).length;

          return (
            <div
              key={page.value}
              className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden"
            >
              {/* ── Page header ── */}
              <button
                onClick={() => togglePage(page.value)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-warm-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-warm-800">{page.label}</h2>
                  <div className="flex items-center gap-2">
                    {page.hasHero && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                        <LucideImage size={12} />
                        {pageSlides.length} hero
                      </span>
                    )}
                    {imageCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warm-100 text-warm-600">
                        <Images size={12} />
                        {imageCount} immagini
                        {savedImageCount > 0 && (
                          <span className="text-green-600 ml-0.5">
                            ({savedImageCount} salvate)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-warm-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* ── Expanded content ── */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-warm-100 space-y-6">
                  {/* Hero Slides section */}
                  {page.hasHero && (
                    <div className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-warm-700 uppercase tracking-wider flex items-center gap-2">
                          <LucideImage size={16} className="text-blue-600" /> Hero Slides
                        </h3>
                        <Link
                          href={`/admin/hero/new?page=${page.value}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-warm-600 hover:text-warm-800 transition-colors bg-warm-100 hover:bg-warm-200 px-3 py-1.5 rounded-lg"
                        >
                          <Plus size={14} /> Nuovo slide
                        </Link>
                      </div>

                      {pageSlides.length > 0 ? (
                        <div className="bg-warm-50 rounded-lg border border-warm-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-warm-200">
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Immagine
                                </th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Titolo
                                </th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Posizione
                                </th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Attivo
                                </th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Ordine
                                </th>
                                <th className="text-right px-4 py-2 text-[11px] font-semibold text-warm-500 uppercase">
                                  Azioni
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-100">
                              {pageSlides.map((s) => (
                                <tr key={s.id} className="hover:bg-white transition-colors">
                                  <td className="px-4 py-2">
                                    <div className="w-14 h-9 relative rounded overflow-hidden bg-warm-200">
                                      {s.imageUrl ? (
                                        <Image
                                          src={s.imageUrl}
                                          alt={s.title}
                                          fill
                                          className="object-cover"
                                          sizes="56px"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-warm-400 text-[10px]">
                                          N/A
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 font-medium text-warm-700">
                                    {s.title || (
                                      <span className="text-warm-400 italic">Senza titolo</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-warm-500 capitalize text-xs">
                                    {s.position}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full ${
                                        s.isActive ? "bg-green-500" : "bg-red-400"
                                      }`}
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-warm-500 text-xs">{s.sortOrder}</td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Link
                                        href={`/admin/hero/${s.id}`}
                                        className="p-1 text-warm-400 hover:text-warm-700 transition-colors"
                                      >
                                        <Pencil size={14} />
                                      </Link>
                                      <button
                                        onClick={() => handleDeleteSlide(s.id)}
                                        className="p-1 text-warm-400 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-warm-400 italic py-3">
                          Nessun hero slide per questa pagina
                        </p>
                      )}
                    </div>
                  )}

                  {/* Page Images section */}
                  {pageConfig && pageConfig.images.length > 0 && (
                    <div className={page.hasHero ? "pt-2" : "pt-5"}>
                      <h3 className="text-sm font-semibold text-warm-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Images size={16} className="text-warm-500" /> Immagini di pagina
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pageConfig.images.map((imgConfig) => (
                          <div key={imgConfig.section}>
                            <ImageUploadField
                              label={imgConfig.label}
                              value={getImageUrl(
                                pageConfig.page,
                                imgConfig.section,
                                imgConfig.defaultUrl
                              )}
                              onChange={(url) =>
                                handleImageChange(pageConfig.page, imgConfig.section, url)
                              }
                              onRemove={() =>
                                handleImageRemove(
                                  pageConfig.page,
                                  imgConfig.section,
                                  imgConfig.defaultUrl
                                )
                              }
                              purpose="general"
                              folder="general"
                              helpText={`Sezione: ${imgConfig.section}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
