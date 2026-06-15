"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus, Copy,
  Type, LayoutTemplate, Grid3x3, Image as ImageIcon, Share2, Package, AlignCenter, Maximize2,
  Wrench, ListOrdered, HelpCircle, BarChart3, Quote as QuoteIcon, Clock, Table,
} from "lucide-react";
import type {
  NewsBlockV2, NewsBlockV2Type,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
  NewsImageWithParagraphData, NewsFullwidthBannerData, NewsProductData,
  NewsCaslonTitleData, NewsTwoImagesInlineData,
  NewsFeatureToolData, NewsCardsRowData, NewsFaqData, NewsStatsData,
  NewsQuoteData, NewsTimelineData, NewsComparisonTableData,
} from "@/types";
import {
  ParagraphEditor, ImageTextBgEditor, ThreeImagesEditor, SingleImageEditor,
  ImageWithParagraphEditor, FullwidthBannerEditor, ProductEditor, ShareInfo, RelatedInfo,
  CaslonTitleEditor, TwoImagesInlineEditor,
  FeatureToolEditor, CardsRowEditor, FaqEditor, StatsEditor,
  QuoteEditor, TimelineEditor, ComparisonTableEditor,
} from "./NewsBlockEditors";

const MENU: { type: NewsBlockV2Type; icon: React.ElementType; label: string }[] = [
  { type: "caslon_title", icon: Type, label: "Titolo (Caslon)" },
  { type: "paragraph", icon: Type, label: "Paragrafo" },
  { type: "image_text_bg", icon: LayoutTemplate, label: "Immagine + Testo (sfondo)" },
  { type: "three_images", icon: Grid3x3, label: "Tre immagini" },
  { type: "two_images_inline", icon: Grid3x3, label: "Due foto affiancate" },
  { type: "single_image", icon: ImageIcon, label: "Immagine singola" },
  { type: "image_with_paragraph", icon: AlignCenter, label: "Immagine + paragrafo centrato" },
  { type: "fullwidth_banner", icon: Maximize2, label: "Banner full-width con testo" },
  { type: "feature_tool", icon: Wrench, label: "Strumento / Feature" },
  { type: "cards_row", icon: ListOrdered, label: "Cards (Come funziona)" },
  { type: "faq", icon: HelpCircle, label: "FAQ" },
  { type: "stats", icon: BarChart3, label: "Statistiche / Numeri" },
  { type: "quote", icon: QuoteIcon, label: "Citazione" },
  { type: "timeline", icon: Clock, label: "Timeline" },
  { type: "comparison_table", icon: Table, label: "Tabella di confronto" },
  { type: "product", icon: Package, label: "Prodotto correlato" },
  { type: "share", icon: Share2, label: "Condividi" },
];
const LABELS: Record<NewsBlockV2Type, string> = {
  ...(Object.fromEntries(MENU.map((m) => [m.type, m.label])) as Record<NewsBlockV2Type, string>),
  related: "Continua a leggere",
};

function defaultData(t: NewsBlockV2Type): NewsBlockV2["data"] {
  switch (t) {
    case "paragraph": return { title: "", body: "" } satisfies NewsParagraphData;
    case "image_text_bg": return { title: "", text: "", imageUrl: "", imagePosition: "left" } satisfies NewsImageTextBgData;
    case "three_images": return { images: [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }] } satisfies NewsThreeImagesData;
    case "single_image": return { imageUrl: "", caption: "" } satisfies NewsSingleImageData;
    case "image_with_paragraph": return { imageUrl: "", title: "", body: "" } satisfies NewsImageWithParagraphData;
    case "fullwidth_banner": return { imageUrl: "", title: "", ctaLabel: "", ctaHref: "" } satisfies NewsFullwidthBannerData;
    case "caslon_title": return { text: "", align: "center" } satisfies NewsCaslonTitleData;
    case "two_images_inline": return { images: [{ url: "" }, { url: "" }], align: "center", caption: "" } satisfies NewsTwoImagesInlineData;
    case "feature_tool": return { imageUrl: "", imagePosition: "left", title: "", description: "", bulletsTitle: "IDEALE PER", bullets: [""], ctas: [] } satisfies NewsFeatureToolData;
    case "cards_row": return { sectionTitle: "", columns: 3, autoNumber: true, items: [{ title: "", description: "" }, { title: "", description: "" }, { title: "", description: "" }] } satisfies NewsCardsRowData;
    case "faq": return { sectionTitle: "", items: [{ question: "", answer: "" }] } satisfies NewsFaqData;
    case "stats": return { sectionTitle: "", columns: 3, items: [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }] } satisfies NewsStatsData;
    case "quote": return { text: "", author: "", authorRole: "", align: "center" } satisfies NewsQuoteData;
    case "timeline": return { sectionTitle: "", items: [{ date: "", title: "", description: "" }] } satisfies NewsTimelineData;
    case "comparison_table": return { sectionTitle: "", columnHeaders: ["Base", "Pro"], rows: [{ label: "", values: ["", ""] }] } satisfies NewsComparisonTableData;
    case "product": return { productId: "" } satisfies NewsProductData;
    case "share": return {};
    case "related": return {};
  }
}

interface Props { value: string; onChange: (json: string) => void; sourceValue?: string }

export default function NewsBlockBuilder({ value, onChange, sourceValue }: Props) {
  const sourceBlocks: NewsBlockV2[] = (() => {
    if (!sourceValue) return [];
    try {
      const p = JSON.parse(sourceValue);
      return Array.isArray(p) ? (p as NewsBlockV2[]) : [];
    } catch { return []; }
  })();
  const sourceById = new Map(sourceBlocks.map((b) => [b.id, b]));
  const [blocks, setBlocks] = useState<NewsBlockV2[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const commit = useCallback((next: NewsBlockV2[]) => {
    setBlocks(next);
    onChange(JSON.stringify(next));
  }, [onChange]);

  useEffect(() => {
    try {
      const raw = value ? JSON.parse(value) : [];
      const parsed = Array.isArray(raw) ? raw : [];
      if (JSON.stringify(parsed) !== JSON.stringify(blocks)) setBlocks(parsed);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const add = (t: NewsBlockV2Type) => { commit([...blocks, { id: crypto.randomUUID(), type: t, data: defaultData(t) }]); setMenuOpen(false); };
  const upd = (id: string, d: NewsBlockV2["data"]) => commit(blocks.map((b) => b.id === id ? { ...b, data: d } : b));
  const del = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const duplicate = (i: number) => {
    const src = blocks[i];
    if (!src) return;
    // Deep-copy della data: usiamo JSON parse/stringify perché tutti i payload
    // dei block sono dati semplici (no Date/Map/funzioni).
    const copy: NewsBlockV2 = {
      id: crypto.randomUUID(),
      type: src.type,
      data: JSON.parse(JSON.stringify(src.data)),
    };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    commit(next);
  };
  const move = (i: number, dir: "up" | "down") => {
    const t = dir === "up" ? i - 1 : i + 1;
    if (t < 0 || t >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[t]] = [next[t], next[i]];
    commit(next);
  };
  const toggle = (id: string) => setCollapsed((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const render = (b: NewsBlockV2) => {
    const src = sourceById.get(b.id);
    switch (b.type) {
      case "paragraph": return <ParagraphEditor data={b.data as NewsParagraphData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsParagraphData> | undefined} />;
      case "image_text_bg": return <ImageTextBgEditor data={b.data as NewsImageTextBgData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsImageTextBgData> | undefined} />;
      case "three_images": return <ThreeImagesEditor data={b.data as NewsThreeImagesData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsThreeImagesData> | undefined} />;
      case "single_image": return <SingleImageEditor data={b.data as NewsSingleImageData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsSingleImageData> | undefined} />;
      case "image_with_paragraph": return <ImageWithParagraphEditor data={b.data as NewsImageWithParagraphData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsImageWithParagraphData> | undefined} />;
      case "fullwidth_banner": return <FullwidthBannerEditor data={b.data as NewsFullwidthBannerData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsFullwidthBannerData> | undefined} />;
      case "caslon_title": return <CaslonTitleEditor data={b.data as NewsCaslonTitleData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsCaslonTitleData> | undefined} />;
      case "two_images_inline": return <TwoImagesInlineEditor data={b.data as NewsTwoImagesInlineData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsTwoImagesInlineData> | undefined} />;
      case "feature_tool": return <FeatureToolEditor data={b.data as NewsFeatureToolData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsFeatureToolData> | undefined} />;
      case "cards_row": return <CardsRowEditor data={b.data as NewsCardsRowData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsCardsRowData> | undefined} />;
      case "faq": return <FaqEditor data={b.data as NewsFaqData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsFaqData> | undefined} />;
      case "stats": return <StatsEditor data={b.data as NewsStatsData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsStatsData> | undefined} />;
      case "quote": return <QuoteEditor data={b.data as NewsQuoteData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsQuoteData> | undefined} />;
      case "timeline": return <TimelineEditor data={b.data as NewsTimelineData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsTimelineData> | undefined} />;
      case "comparison_table": return <ComparisonTableEditor data={b.data as NewsComparisonTableData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsComparisonTableData> | undefined} />;
      case "product": return <ProductEditor data={b.data as NewsProductData} onChange={(d) => upd(b.id, d)} />;
      case "share": return <ShareInfo />;
      case "related": return <RelatedInfo />;
    }
  };

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        const isC = collapsed.has(b.id);
        const menuItem = MENU.find((m) => m.type === b.type);
        const Icon = menuItem?.icon;
        return (
          <div key={b.id} className="bg-white rounded-xl shadow-md border-l-4 border-l-warm-800 border-t border-r border-b border-warm-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-warm-200 bg-warm-100">
              <GripVertical size={16} className="text-warm-500 flex-shrink-0" />
              <span className="text-xs font-mono text-warm-500 mr-1">#{String(i + 1).padStart(2, "0")}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-800 text-white text-xs font-medium rounded-full">
                {Icon && <Icon size={12} />}
                {LABELS[b.type]}
              </span>
              <div className="flex-1" />
              <button type="button" onClick={() => move(i, "up")} disabled={i === 0} className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-white disabled:opacity-30" title="Sposta su"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, "down")} disabled={i === blocks.length - 1} className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-white disabled:opacity-30" title="Sposta giù"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => duplicate(i)} className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-white" title="Duplica sezione"><Copy size={14} /></button>
              <button type="button" onClick={() => toggle(b.id)} className="p-1.5 rounded text-warm-500 hover:text-warm-800 hover:bg-white" title={isC ? "Espandi" : "Comprimi"}>{isC ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
              <button type="button" onClick={() => del(b.id)} className="p-1.5 rounded text-warm-500 hover:text-red-600 hover:bg-red-50" title="Elimina sezione"><Trash2 size={14} /></button>
            </div>
            {!isC && <div className="px-4 py-4">{render(b)}</div>}
          </div>
        );
      })}

      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((p) => !p)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 rounded-xl text-sm text-warm-500 hover:border-warm-400 hover:text-warm-700 hover:bg-warm-50">
          <Plus size={16} />Aggiungi sezione
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-warm-200 z-20 overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-warm-100">
              {MENU.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.type} type="button" onClick={() => add(m.type)} className="flex flex-col items-center gap-1.5 px-3 py-4 bg-white text-warm-600 hover:bg-warm-50 hover:text-warm-800">
                    <Icon size={20} />
                    <span className="text-xs font-medium text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
