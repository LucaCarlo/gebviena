"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check, FileText } from "lucide-react";
import NewsBlockBuilder from "./news/NewsBlockBuilder";
import NewsRightPanel from "./news/NewsRightPanel";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import { slugify } from "@/lib/utils";
import type { NewsBlockV2, NewsBlockStyle } from "@/types";


interface NewsFormProps {
  articleId?: string;
  category?: string;
}

// Label fallback solo per le 4 categorie di default; le altre (custom) usano la label DB.
const CATEGORY_LABELS: Record<string, string> = {
  exhibition: "Exhibition",
  news: "News",
  "rassegna-stampa": "Rassegna stampa",
  storia: "Storia",
};

interface CategoryOption { id: string; value: string; label: string }

export default function NewsForm({ articleId, category: categoryProp }: NewsFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  useEffect(() => {
    fetch("/api/categories?contentType=news")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setCategories((d.data as Array<{ id: string; value: string; label: string }>).map((c) => ({ id: c.id, value: c.value, label: c.label })));
        }
      }).catch(() => {});
  }, []);
  const tCtx = useTranslationCtx();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newTag, setNewTag] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Selezione blocco nel canvas — null = nessun blocco selezionato → pannello dx mostra impostazioni pagina.
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  useEffect(() => {
    if (!savedAt) return;
    const id = setTimeout(() => setSavedAt(null), 3500);
    return () => clearTimeout(id);
  }, [savedAt]);
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

  /* ── Blocchi derivati dal JSON + mutazioni per il pannello dx ── */
  const blocksJson = tCtx?.isTranslating ? (tCtx.getValue("blocks", "") || form.blocksV2) : form.blocksV2;
  const sourceJson = tCtx?.isTranslating ? form.blocksV2 : undefined;
  const blocks: NewsBlockV2[] = useMemo(() => {
    try { const p = JSON.parse(blocksJson || "[]"); return Array.isArray(p) ? p : []; } catch { return []; }
  }, [blocksJson]);
  const sourceBlocks: NewsBlockV2[] = useMemo(() => {
    if (!sourceJson) return [];
    try { const p = JSON.parse(sourceJson); return Array.isArray(p) ? p : []; } catch { return []; }
  }, [sourceJson]);
  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedBlockId) || null, [blocks, selectedBlockId]);
  const sourceBlock = useMemo(() => sourceBlocks.find((b) => b.id === selectedBlockId) || undefined, [sourceBlocks, selectedBlockId]);

  const commitBlocks = (next: NewsBlockV2[]) => {
    const json = JSON.stringify(next);
    if (tCtx?.isTranslating) tCtx.setValue("blocks", json);
    else updateField("blocksV2", json);
  };
  const handleBlockDataChange = (data: NewsBlockV2["data"]) => {
    if (!selectedBlockId) return;
    commitBlocks(blocks.map((b) => b.id === selectedBlockId ? { ...b, data } : b));
  };
  const handleBlockStyleChange = (style: NewsBlockStyle | null) => {
    if (!selectedBlockId) return;
    commitBlocks(blocks.map((b) => {
      if (b.id !== selectedBlockId) return b;
      if (style === null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { style: _s, ...rest } = b;
        return rest as NewsBlockV2;
      }
      return { ...b, style };
    }));
  };

  /* ── Translate all block texts with AI ──────────────────── */
  const [translatingBlocks, setTranslatingBlocks] = useState(false);

  const collectBlockTexts = (blocks: NewsBlockV2[]): Record<string, string> => {
    const out: Record<string, string> = {};
    blocks.forEach((b, i) => {
      const d = b.data as Record<string, unknown>;
      const put = (sub: string, v: unknown) => {
        if (typeof v === "string" && v.trim()) out[`${i}.${sub}`] = v;
      };
      switch (b.type) {
        case "paragraph":
          put("title", d.title); put("body", d.body); break;
        case "image_text_bg":
          put("title", d.title); put("text", d.text); put("ctaLabel", d.ctaLabel); break;
        case "single_image":
          put("caption", d.caption); break;
        case "image_with_paragraph":
          put("title", d.title); put("body", d.body); break;
        case "fullwidth_banner":
          put("title", d.title); put("ctaLabel", d.ctaLabel); break;
        case "three_images": {
          const imgs = (d.images as { caption?: string }[]) || [];
          imgs.forEach((img, j) => {
            if (img.caption && img.caption.trim()) out[`${i}.images.${j}.caption`] = img.caption;
          });
          break;
        }
      }
    });
    return out;
  };

  const applyBlockTexts = (blocks: NewsBlockV2[], translations: Record<string, string>): NewsBlockV2[] => {
    return blocks.map((b, i) => {
      const data = { ...(b.data as Record<string, unknown>) };
      const get = (sub: string) => translations[`${i}.${sub}`];
      switch (b.type) {
        case "paragraph":
          if (get("title") !== undefined) data.title = get("title");
          if (get("body") !== undefined) data.body = get("body");
          break;
        case "image_text_bg":
          if (get("title") !== undefined) data.title = get("title");
          if (get("text") !== undefined) data.text = get("text");
          if (get("ctaLabel") !== undefined) data.ctaLabel = get("ctaLabel");
          break;
        case "single_image":
          if (get("caption") !== undefined) data.caption = get("caption");
          break;
        case "image_with_paragraph":
          if (get("title") !== undefined) data.title = get("title");
          if (get("body") !== undefined) data.body = get("body");
          break;
        case "fullwidth_banner":
          if (get("title") !== undefined) data.title = get("title");
          if (get("ctaLabel") !== undefined) data.ctaLabel = get("ctaLabel");
          break;
        case "three_images": {
          const imgs = ((data.images as { url: string; caption: string }[]) || []).map((img, j) => {
            const tr = translations[`${i}.images.${j}.caption`];
            return tr !== undefined ? { ...img, caption: tr } : img;
          });
          data.images = imgs;
          break;
        }
      }
      return { ...b, data: data as NewsBlockV2["data"] };
    });
  };

  const handleTranslateBlocks = async () => {
    if (!tCtx?.isTranslating) return;
    let sourceBlocksLocal: NewsBlockV2[];
    try {
      const parsed = JSON.parse(form.blocksV2 || "[]");
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("Nessun blocco da tradurre nella lingua di default");
        return;
      }
      sourceBlocksLocal = parsed as NewsBlockV2[];
    } catch {
      setError("JSON dei blocchi non valido");
      return;
    }
    const fields = collectBlockTexts(sourceBlocksLocal);
    if (Object.keys(fields).length === 0) {
      setError("Nessun testo da tradurre nei blocchi");
      return;
    }
    setTranslatingBlocks(true);
    setError("");
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, fromLang: tCtx.defaultLang, toLang: tCtx.lang, htmlMode: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Errore traduzione");
        return;
      }
      const translatedBlocks = applyBlockTexts(sourceBlocksLocal, data.translations || {});
      tCtx.setValue("blocks", JSON.stringify(translatedBlocks));
    } catch {
      setError("Errore di connessione");
    } finally {
      setTranslatingBlocks(false);
    }
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (tCtx?.isTranslating) {
      const ok = await tCtx.saveTranslation();
      setLoading(false);
      if (ok) setSavedAt(Date.now());
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
        if (articleId) {
          setSavedAt(Date.now());
          if (data.data?.slug && data.data.slug !== form.slug) {
            setForm((prev) => ({ ...prev, slug: data.data.slug }));
          }
        } else {
          router.push(`/admin/news/${data.data.id}`);
        }
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
    <form onSubmit={handleSubmit} className="flex items-start min-h-[calc(100vh-80px)] -mr-4 lg:-mr-8">
      {/* CANVAS — sinistra, scroll naturale della pagina */}
      <div className="flex-1 min-w-0 pr-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>
        )}

        {/* Header canvas: nome articolo + traduci AI */}
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-warm-200">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-warm-500">Articolo</div>
            <h1 className="text-base font-semibold text-warm-900 truncate flex items-center gap-2">
              <FileText size={14} /> {form.title || "Senza titolo"}
            </h1>
          </div>
          {tCtx?.isTranslating && (
            <button
              type="button"
              onClick={handleTranslateBlocks}
              disabled={translatingBlocks}
              title="Traduce con AI tutti i testi (titoli, paragrafi, didascalie, CTA) dalla lingua di default"
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded disabled:opacity-50"
            >
              {translatingBlocks ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {translatingBlocks ? "Traduzione in corso..." : "Traduci sezioni con AI"}
            </button>
          )}
        </div>

        {/* Blocchi della pagina */}
        <div
          // Click sul vuoto (non su una card) deseleziona il blocco corrente.
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBlockId(null);
          }}
        >
          <NewsBlockBuilder
            value={blocksJson}
            sourceValue={sourceJson}
            selectedId={selectedBlockId}
            onSelect={setSelectedBlockId}
            onChange={(json) => {
              if (tCtx?.isTranslating) tCtx.setValue("blocks", json);
              else updateField("blocksV2", json);
            }}
          />
        </div>

        {/* Submit — sticky bottom */}
        <div className="sticky bottom-0 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-warm-50 border-t border-warm-200 flex items-center gap-3 z-10">
          <button type="submit" disabled={loading} className="bg-warm-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
            {loading ? "Salvataggio..." : articleId ? "Aggiorna" : "Crea articolo"}
          </button>
          <button type="button" onClick={() => router.push("/admin/news")} className="px-6 py-2.5 rounded-lg text-sm font-medium text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors">
            {articleId ? "Torna alla lista" : "Annulla"}
          </button>
          {savedAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded animate-pulse">
              <Check size={14} /> Salvato
            </span>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — fisso 360px, sticky top, h-screen */}
      <aside className="hidden lg:block w-[360px] flex-shrink-0 sticky top-0 h-screen border-l border-warm-200 bg-warm-50 overflow-hidden">
        <NewsRightPanel
          selectedBlock={selectedBlock}
          sourceBlock={sourceBlock}
          onCloseSelection={() => setSelectedBlockId(null)}
          onBlockDataChange={handleBlockDataChange}
          onBlockStyleChange={handleBlockStyleChange}
          form={form}
          updateField={updateField}
          handleTitleChange={handleTitleChange}
          categories={categories}
          CATEGORY_LABELS={CATEGORY_LABELS}
          newTag={newTag}
          setNewTag={setNewTag}
          addTag={addTag}
          removeTag={removeTag}
        />
      </aside>
    </form>
  );
}
