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
  Languages,
} from "lucide-react";
import { HERO_PAGES, PAGE_IMAGES_CONFIG } from "@/lib/constants";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { UI_STRINGS_BY_KEY } from "@/lib/ui-strings";
import type { HeroSlide, PageImage } from "@/types";

interface LanguageRow {
  code: string;
  name: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface UiOverride {
  key: string;
  languageCode: string;
  value: string;
}

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

  /* ── i18n state (per-section editable texts) ── */
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [targetLang, setTargetLang] = useState<string>("it");
  // overrides[key][lang] = value
  const [textOverrides, setTextOverrides] = useState<Record<string, Record<string, string>>>({});
  // textEdits[`${lang}:${key}`] = value
  const [textEdits, setTextEdits] = useState<Record<string, string>>({});

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

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch("/api/languages");
      const data = await res.json();
      if (data.success) {
        setLanguages(data.data);
        const def = (data.data as LanguageRow[]).find((l) => l.isDefault);
        if (def) setTargetLang(def.code);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchTextOverrides = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ui-translations");
      const data = await res.json();
      if (data.success) {
        const map: Record<string, Record<string, string>> = {};
        for (const o of data.data as UiOverride[]) {
          if (!map[o.key]) map[o.key] = {};
          map[o.key][o.languageCode] = o.value;
        }
        setTextOverrides(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSlides();
    fetchImages();
    fetchLanguages();
    fetchTextOverrides();
  }, [fetchSlides, fetchImages, fetchLanguages, fetchTextOverrides]);

  /* ── Hero slide actions ── */
  const handleDeleteSlide = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo slide?")) return;
    await fetch(`/api/hero-slides/${id}`, { method: "DELETE" });
    fetchSlides();
  };

  const [linkEdits, setLinkEdits] = useState<Record<string, string>>({});

  /* ── Page images helpers ── */
  const getImageUrl = (page: string, section: string, defaultUrl: string) => {
    const key = `${page}:${section}`;
    if (key in edits) return edits[key];
    const existing = images.find((i) => i.page === page && i.section === section);
    return existing?.imageUrl || defaultUrl;
  };

  const getLinkUrl = (page: string, section: string) => {
    const key = `${page}:${section}`;
    if (key in linkEdits) return linkEdits[key];
    const existing = images.find((i) => i.page === page && i.section === section);
    return existing?.linkUrl || "";
  };

  const handleImageChange = (page: string, section: string, url: string) => {
    setEdits((prev) => ({ ...prev, [`${page}:${section}`]: url }));
    setDirty(true);
    setSaved(false);
  };

  const handleLinkChange = (page: string, section: string, url: string) => {
    setLinkEdits((prev) => ({ ...prev, [`${page}:${section}`]: url }));
    setDirty(true);
    setSaved(false);
  };

  /* ── Text (UI translation override) helpers ── */
  const getTextValue = (uiKey: string, lang: string) => {
    const editKey = `${lang}:${uiKey}`;
    if (editKey in textEdits) return textEdits[editKey];
    const override = textOverrides[uiKey]?.[lang];
    if (override !== undefined) return override;
    // Fallback to IT default from code
    return UI_STRINGS_BY_KEY[uiKey]?.defaultValue ?? "";
  };

  const handleTextChange = (uiKey: string, lang: string, value: string) => {
    setTextEdits((prev) => ({ ...prev, [`${lang}:${uiKey}`]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleImageRemove = (page: string, section: string, defaultUrl: string) => {
    handleImageChange(page, section, defaultUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const imagesToSave: { page: string; section: string; label: string; imageUrl: string; linkUrl?: string | null; sortOrder: number }[] = [];
    for (const pageConfig of PAGE_IMAGES_CONFIG) {
      for (let idx = 0; idx < pageConfig.images.length; idx++) {
        const imgConfig = pageConfig.images[idx];
        const url = getImageUrl(pageConfig.page, imgConfig.section, imgConfig.defaultUrl);
        const link = imgConfig.acceptLink ? getLinkUrl(pageConfig.page, imgConfig.section) : null;
        imagesToSave.push({
          page: pageConfig.page,
          section: imgConfig.section,
          label: imgConfig.label,
          imageUrl: url,
          linkUrl: link || null,
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
      if (!data.success) {
        alert("Errore: " + (data.error || "Salvataggio fallito"));
        setSaving(false);
        return;
      }

      // Persist text edits (UI translation overrides), with concurrency cap
      const textEntries = Object.entries(textEdits);
      if (textEntries.length > 0) {
        const CONCURRENCY = 6;
        for (let i = 0; i < textEntries.length; i += CONCURRENCY) {
          const batch = textEntries.slice(i, i + CONCURRENCY);
          await Promise.all(batch.map(async ([composite, value]) => {
            const idx = composite.indexOf(":");
            const lang = composite.slice(0, idx);
            const uiKey = composite.slice(idx + 1);
            await fetch("/api/admin/ui-translations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: uiKey, languageCode: lang, value }),
            });
          }));
        }
      }

      setSaved(true);
      setDirty(false);
      setEdits({});
      setLinkEdits({});
      setTextEdits({});
      await Promise.all([fetchImages(), fetchTextOverrides()]);
      setTimeout(() => setSaved(false), 3000);
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
          <h1 className="text-2xl font-semibold text-warm-800">Gestione Contenuti</h1>
          <p className="text-sm text-warm-500 mt-1">
            Hero slides, immagini, testi e link di pagina per tutto il sito
          </p>
        </div>
        <div className="flex items-center gap-2">
          {languages.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-lg px-3 py-1.5">
              <Languages size={14} className="text-warm-500" />
              <span className="text-[11px] font-semibold text-warm-600 uppercase tracking-wider">Testi in</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-sm focus:outline-none bg-transparent"
                title="Lingua dei testi modificabili per sezione"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag || ""} {l.name}{l.isDefault ? " (default)" : ""}</option>
                ))}
              </select>
            </div>
          )}
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
            {saving ? "Salvataggio..." : saved ? "Salvato!" : "Salva"}
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
                          <div key={imgConfig.section} className="space-y-2">
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
                              acceptVideo={imgConfig.acceptVideo}
                              aspectRatio={imgConfig.aspectRatio}
                            />
                            {imgConfig.acceptLink && (
                              <div>
                                <label className="block text-[11px] font-semibold text-warm-600 uppercase tracking-wider mb-1">
                                  Link URL (opzionale)
                                </label>
                                <input
                                  type="url"
                                  value={getLinkUrl(pageConfig.page, imgConfig.section)}
                                  onChange={(e) => handleLinkChange(pageConfig.page, imgConfig.section, e.target.value)}
                                  placeholder="https://... oppure /prodotti/nome-prodotto"
                                  className="w-full border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
                                />
                                <p className="text-[10px] text-warm-400 mt-1">Se compilato, il CTA della sezione punterà a questo URL (accetta path interni o URL completi).</p>
                              </div>
                            )}
                            {imgConfig.textKeys && imgConfig.textKeys.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-warm-100">
                                <p className="text-[11px] font-semibold text-warm-600 uppercase tracking-wider">
                                  Testi ({targetLang.toUpperCase()})
                                </p>
                                {imgConfig.textKeys.map((tk) => {
                                  const currentValue = getTextValue(tk.key, targetLang);
                                  const hasOverride = !!textOverrides[tk.key]?.[targetLang];
                                  const isEdited = `${targetLang}:${tk.key}` in textEdits;
                                  return (
                                    <div key={tk.key}>
                                      <label className="block text-[10px] font-medium text-warm-500 mb-1">
                                        {tk.label}
                                        <code className="ml-2 text-warm-400">{tk.key}</code>
                                      </label>
                                      {tk.long ? (
                                        <textarea
                                          value={currentValue}
                                          onChange={(e) => handleTextChange(tk.key, targetLang, e.target.value)}
                                          rows={3}
                                          className={`w-full border rounded px-3 py-1.5 text-xs focus:outline-none resize-y ${
                                            isEdited ? "border-amber-400 bg-amber-50" : hasOverride ? "border-green-300 bg-green-50" : "border-warm-300"
                                          }`}
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          value={currentValue}
                                          onChange={(e) => handleTextChange(tk.key, targetLang, e.target.value)}
                                          className={`w-full border rounded px-3 py-1.5 text-xs focus:outline-none ${
                                            isEdited ? "border-amber-400 bg-amber-50" : hasOverride ? "border-green-300 bg-green-50" : "border-warm-300"
                                          }`}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
