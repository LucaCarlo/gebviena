"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Image from "next/image";
import ImageUploadField from "./ImageUploadField";
import SeoPanel from "./SeoPanel";
import RichTextEditor from "./RichTextEditor";
import { slugify } from "@/lib/utils";

interface NewsFormProps {
  articleId?: string;
  category?: string;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  coverImage: string | null;
}

interface StoriaSection {
  title: string;
  text: string;
  imageUrl: string;
}

interface StoriaBlocks {
  mediaType: "video" | "image";
  mediaUrl: string;
  sections: [StoriaSection, StoriaSection, StoriaSection];
  iconUrl: string;
  iconTitle: string;
  iconText: string;
  productId: string;
}

const EMPTY_STORIA: StoriaBlocks = {
  mediaType: "video",
  mediaUrl: "",
  sections: [
    { title: "", text: "", imageUrl: "" },
    { title: "", text: "", imageUrl: "" },
    { title: "", text: "", imageUrl: "" },
  ],
  iconUrl: "",
  iconTitle: "",
  iconText: "",
  productId: "",
};

const SECTION_LABELS = [
  "Sezione 1 — immagine a destra",
  "Sezione 2 — immagine a sinistra",
  "Sezione 3 — immagine a destra",
];

const CATEGORY_LABELS: Record<string, string> = {
  exhibition: "Exhibition",
  news: "News",
  "rassegna-stampa": "Rassegna stampa",
  storia: "Storia",
};

export default function NewsForm({ articleId, category: categoryProp }: NewsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [newTag, setNewTag] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    subtitle: "",
    category: categoryProp || "",
    tags: "[]",
    content: "",
    imageUrl: "",
    source: "",
    sourceUrl: "",
    publishedAt: "",
    isActive: true,
    sortOrder: 0,
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "[]",
  });

  const isStoria = form.category === "storia";

  /* ── Storia-specific state (separate from form to avoid JSON parse/stringify cycles) */
  const [storia, setStoria] = useState<StoriaBlocks>(() => ({ ...EMPTY_STORIA }));

  const updateStoria = useCallback((patch: Partial<StoriaBlocks>) => {
    setStoria((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateStoriaSection = useCallback((index: number, patch: Partial<StoriaSection>) => {
    setStoria((prev) => {
      const sections = [...prev.sections] as [StoriaSection, StoriaSection, StoriaSection];
      sections[index] = { ...sections[index], ...patch };
      return { ...prev, sections };
    });
  }, []);

  /* ── Load article ────────────────────────────────────────── */
  const loadArticle = useCallback(async () => {
    if (!articleId) return;
    const res = await fetch(`/api/news/${articleId}`);
    const data = await res.json();
    if (data.success) {
      const a = data.data;
      setForm({
        title: a.title || "",
        slug: a.slug || "",
        subtitle: a.subtitle || "",
        category: a.category || "",
        tags: a.tags || "[]",
        content: a.content || "",
        imageUrl: a.imageUrl || "",
        source: a.source || "",
        sourceUrl: a.sourceUrl || "",
        publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 16) : "",
        isActive: a.isActive ?? true,
        sortOrder: a.sortOrder ?? 0,
        seoTitle: a.seoTitle || "",
        seoDescription: a.seoDescription || "",
        seoKeywords: a.seoKeywords || "[]",
      });
      // Initialize storia data from blocks
      if (a.blocks) {
        try {
          const parsed = JSON.parse(a.blocks);
          setStoria({
            ...EMPTY_STORIA,
            ...parsed,
            sections: parsed.sections || EMPTY_STORIA.sections,
          });
        } catch { /* invalid JSON, keep defaults */ }
      }
    }
  }, [articleId]);

  useEffect(() => {
    loadArticle();
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((data) => setProducts(data.data || []));
  }, [loadArticle]);

  /* ── Helpers ─────────────────────────────────────────────── */
  const updateField = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: articleId ? prev.slug : slugify(title),
    }));
  };

  const tags: string[] = (() => {
    try { return JSON.parse(form.tags); } catch { return []; }
  })();

  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      updateField("tags", JSON.stringify([...tags, t]));
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    updateField("tags", JSON.stringify(tags.filter((tt) => tt !== tag)));
  };

  const selectedProduct = products.find((p) => p.id === storia.productId);

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        ...form,
        blocks: isStoria ? JSON.stringify(storia) : "{}",
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      const url = articleId ? `/api/news/${articleId}` : "/api/news";
      const method = articleId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/news");
      } else {
        setError(data.error || "Errore nel salvataggio");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-6 items-start">
      {/* Left: main form */}
      <div className="flex-1 min-w-0 max-w-4xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>
        )}

        {/* Category badge (read-only) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-warm-400 uppercase tracking-wider">Categoria:</span>
          <span className="px-3 py-1 bg-warm-100 text-warm-700 text-xs font-semibold uppercase tracking-wider rounded-full">
            {CATEGORY_LABELS[form.category] || form.category}
          </span>
        </div>

        {/* ── COMMON FIELDS ────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo *</label>
            <input type="text" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => updateField("slug", e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Data pubblicazione</label>
              <input type="datetime-local" value={form.publishedAt} onChange={(e) => updateField("publishedAt", e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => updateField("isActive", e.target.checked)} className="w-4 h-4 rounded border-warm-300 text-warm-800 focus:ring-warm-800" />
                <span className="text-sm text-warm-700">Attivo (visibile sul sito)</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-warm-100 text-warm-700 text-xs rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-600"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Aggiungi tag..." className="flex-1 border border-warm-300 rounded px-4 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
              <button type="button" onClick={addTag} className="px-4 py-2 text-sm bg-warm-100 text-warm-700 rounded hover:bg-warm-200 transition-colors">Aggiungi</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Fonte</label>
              <input type="text" value={form.source} onChange={(e) => updateField("source", e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" placeholder="es. Corriere della Sera" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">URL Fonte</label>
              <input type="text" value={form.sourceUrl} onChange={(e) => updateField("sourceUrl", e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" placeholder="https://..." />
            </div>
          </div>

          <input type="hidden" name="sortOrder" value={form.sortOrder} />
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION 1: Immagine + Testo (common to all categories)
            ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Sezione Immagine + Testo</h2>
          <p className="text-[11px] text-warm-400">Sezione a tutta altezza con immagine a sinistra e testo a destra</p>

          <ImageUploadField label="Immagine" value={form.imageUrl} onChange={(url) => updateField("imageUrl", url)} onRemove={() => updateField("imageUrl", "")} purpose="cover" folder="news" />

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo sezione</label>
            <input type="text" value={form.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          </div>

          <RichTextEditor
            label="Testo"
            value={form.content}
            onChange={(html) => updateField("content", html)}
          />
        </div>

        {/* ══════════════════════════════════════════════════════
            STORIA-SPECIFIC SECTIONS
            ══════════════════════════════════════════════════════ */}
        {isStoria && (
          <>
            {/* Media (video or image) */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Media</h2>
              <p className="text-[11px] text-warm-400">Video o immagine a tutta larghezza dopo la prima sezione</p>
              <div className="flex gap-3">
                {(["video", "image"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateStoria({ mediaType: t })}
                    className={`px-4 py-2 text-xs rounded border transition-colors ${
                      storia.mediaType === t
                        ? "bg-warm-800 text-white border-warm-800"
                        : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
                    }`}
                  >
                    {t === "video" ? "Video" : "Immagine"}
                  </button>
                ))}
              </div>
              {storia.mediaType === "video" ? (
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">URL Video</label>
                  <input
                    type="text"
                    value={storia.mediaUrl}
                    onChange={(e) => updateStoria({ mediaUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  />
                </div>
              ) : (
                <ImageUploadField
                  label="Immagine media"
                  value={storia.mediaUrl}
                  onChange={(url) => updateStoria({ mediaUrl: url })}
                  onRemove={() => updateStoria({ mediaUrl: "" })}
                  folder="news"
                  purpose="news"
                />
              )}
            </div>

            {/* 3 alternating sections */}
            {storia.sections.map((sec, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
                <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">{SECTION_LABELS[i]}</h2>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo</label>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => updateStoriaSection(i, { title: e.target.value })}
                    className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  />
                </div>
                <RichTextEditor
                  label="Testo"
                  value={sec.text}
                  onChange={(html) => updateStoriaSection(i, { text: html })}
                />
                <ImageUploadField
                  label="Immagine"
                  value={sec.imageUrl}
                  onChange={(url) => updateStoriaSection(i, { imageUrl: url })}
                  onRemove={() => updateStoriaSection(i, { imageUrl: "" })}
                  folder="news"
                  purpose="news"
                />
              </div>
            ))}

            {/* Icon + centered text */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Icona + Testo centrato</h2>
              <ImageUploadField
                label="Icona (immagine piccola)"
                value={storia.iconUrl}
                onChange={(url) => updateStoria({ iconUrl: url })}
                onRemove={() => updateStoria({ iconUrl: "" })}
                folder="news"
                purpose="news"
              />
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo</label>
                <input
                  type="text"
                  value={storia.iconTitle}
                  onChange={(e) => updateStoria({ iconTitle: e.target.value })}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Paragrafo</label>
                <textarea
                  value={storia.iconText}
                  onChange={(e) => updateStoria({ iconText: e.target.value })}
                  rows={4}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 resize-y"
                />
              </div>
            </div>

            {/* Product reference */}
            <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Prodotto correlato</h2>
              <p className="text-[11px] text-warm-400">Sezione a tutta larghezza con immagine del prodotto e link</p>
              <select
                value={storia.productId}
                onChange={(e) => updateStoria({ productId: e.target.value })}
                className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
              >
                <option value="">— Nessun prodotto —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedProduct && (
                <div className="flex items-center gap-3 p-3 bg-warm-50 rounded">
                  <div className="relative w-16 h-16 bg-warm-200 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={selectedProduct.coverImage || selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-warm-800">{selectedProduct.name}</p>
                    <p className="text-xs text-warm-400">/prodotti/{selectedProduct.slug}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
            {loading ? "Salvataggio..." : articleId ? "Aggiorna" : "Crea articolo"}
          </button>
          <button type="button" onClick={() => router.push("/admin/news")} className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors">
            Annulla
          </button>
        </div>
      </div>

      {/* Right: SEO sidebar */}
      <div className="w-80 flex-shrink-0 hidden lg:block sticky top-6">
        <SeoPanel
          seoTitle={form.seoTitle}
          seoDescription={form.seoDescription}
          seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
          slug={form.slug}
          content={form.content || ""}
          onChange={(field, value) => {
            if (field === "seoKeywords") {
              updateField("seoKeywords", JSON.stringify(value));
            } else {
              updateField(field, value as string);
            }
          }}
        />
      </div>
    </form>
  );
}
