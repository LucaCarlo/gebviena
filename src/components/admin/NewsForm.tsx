"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ImageUploadField from "./ImageUploadField";
import SeoPanel from "./SeoPanel";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { TInput } from "./TranslatableField";
import NewsBlockBuilder from "./news/NewsBlockBuilder";
import { slugify } from "@/lib/utils";

interface NewsFormProps {
  articleId?: string;
  category?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  exhibition: "Exhibition",
  news: "News",
  "rassegna-stampa": "Rassegna stampa",
  storia: "Storia",
};

export default function NewsForm({ articleId, category: categoryProp }: NewsFormProps) {
  const tCtx = useTranslationCtx();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
    blocksV2: "[]",
  });

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
        blocksV2: (() => {
          if (!a.blocks) return "[]";
          try {
            const p = JSON.parse(a.blocks);
            return Array.isArray(p) ? JSON.stringify(p) : "[]";
          } catch { return "[]"; }
        })(),
      });
    }
  }, [articleId]);

  useEffect(() => {
    loadArticle();
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

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (tCtx?.isTranslating) {
      const ok = await tCtx.saveTranslation();
      setLoading(false);
      if (ok) router.push("/admin/news");
      return;
    }
    try {
      const { blocksV2: _blocksV2, ...rest } = form;
      void _blocksV2;
      const body = {
        ...rest,
        blocks: form.blocksV2 || "[]",
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
            <TInput fieldKey="title" defaultValue={form.title} onDefaultChange={handleTitleChange} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Sottotitolo</label>
            <TInput fieldKey="subtitle" defaultValue={form.subtitle} onDefaultChange={(v) => updateField("subtitle", v)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" placeholder="Mostrato sotto il titolo in stile categoria" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Slug</label>
            <TInput fieldKey="slug" defaultValue={form.slug} onDefaultChange={(v) => updateField("slug", v)} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm bg-warm-50 focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          </div>

          <ImageUploadField label="Immagine di copertina (usata nelle anteprime)" value={form.imageUrl} onChange={(url) => updateField("imageUrl", url)} onRemove={() => updateField("imageUrl", "")} purpose="cover" folder="news" aspectRatio={1} />

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

        {/* Sezioni dinamiche — uguali per tutte le categorie */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-warm-800 uppercase tracking-wider">Sezioni della pagina</h2>
            <p className="text-[11px] text-warm-400 mt-1">Aggiungi e ordina le sezioni come preferisci.</p>
          </div>
          <NewsBlockBuilder value={form.blocksV2} onChange={(json) => updateField("blocksV2", json)} />
        </div>

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
