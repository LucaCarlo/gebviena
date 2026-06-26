"use client";

import { useState, useCallback, useEffect } from "react";
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus, Copy, X,
  Type, LayoutTemplate, Grid3x3, Image as ImageIcon, Share2, Package, AlignCenter, Maximize2,
  Wrench, ListOrdered, HelpCircle, BarChart3, Quote as QuoteIcon, Clock, Table, Search,
} from "lucide-react";
import type {
  NewsBlockV2, NewsBlockV2Type,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
  NewsImageWithParagraphData, NewsFullwidthBannerData, NewsProductData,
  NewsCaslonTitleData, NewsTwoImagesInlineData,
  NewsFeatureToolData, NewsSingleCtaData, NewsCardsRowData, NewsFaqData, NewsStatsData,
  NewsQuoteData, NewsTimelineData, NewsComparisonTableData,
} from "@/types";
import {
  ParagraphEditor, ImageTextBgEditor, ThreeImagesEditor, SingleImageEditor,
  ImageWithParagraphEditor, FullwidthBannerEditor, ProductEditor, ShareInfo, RelatedInfo,
  CaslonTitleEditor, TwoImagesInlineEditor,
  FeatureToolEditor, SingleCtaEditor, CardsRowEditor, FaqEditor, StatsEditor,
  QuoteEditor, TimelineEditor, ComparisonTableEditor,
} from "./NewsBlockEditors";

// Categorie del picker (step 2 dell'editor): widget atomici, layout (colonne
// in arrivo), template compositi gia pronti dalle sezioni esistenti.
type PickerCategory = "widget" | "layout" | "template";

interface MenuItem {
  type: NewsBlockV2Type;
  icon: React.ElementType;
  label: string;
  category: PickerCategory;
  keywords?: string;
}

const MENU: MenuItem[] = [
  // Widget = blocchi atomici (titolo, paragrafo, immagine singola, ecc.)
  { type: "caslon_title", icon: Type, label: "Titolo (Caslon)", category: "widget", keywords: "heading h1 h2 hero" },
  { type: "paragraph", icon: Type, label: "Paragrafo", category: "widget", keywords: "text testo" },
  { type: "single_image", icon: ImageIcon, label: "Immagine singola", category: "widget", keywords: "foto picture media" },
  { type: "single_cta", icon: Type, label: "Pulsante CTA", category: "widget", keywords: "button link azione" },
  { type: "quote", icon: QuoteIcon, label: "Citazione", category: "widget", keywords: "blockquote frase" },
  { type: "share", icon: Share2, label: "Condividi", category: "widget", keywords: "social facebook" },

  // Template = sezioni gia composte (immagine + testo, gallery, cards, ecc.)
  { type: "image_text_bg", icon: LayoutTemplate, label: "Immagine + Testo", category: "template", keywords: "split half" },
  { type: "image_with_paragraph", icon: AlignCenter, label: "Immagine + paragrafo centrato", category: "template", keywords: "narrow content" },
  { type: "three_images", icon: Grid3x3, label: "Tre immagini", category: "template", keywords: "gallery row 3" },
  { type: "two_images_inline", icon: Grid3x3, label: "Due foto affiancate", category: "template", keywords: "gallery row 2" },
  { type: "fullwidth_banner", icon: Maximize2, label: "Banner full-width con testo", category: "template", keywords: "hero cover" },
  { type: "feature_tool", icon: Wrench, label: "Strumento / Feature", category: "template", keywords: "card bullets ideal" },
  { type: "cards_row", icon: ListOrdered, label: "Cards (Come funziona)", category: "template", keywords: "steps numerati" },
  { type: "faq", icon: HelpCircle, label: "FAQ", category: "template", keywords: "domande accordion" },
  { type: "stats", icon: BarChart3, label: "Statistiche / Numeri", category: "template", keywords: "kpi metriche" },
  { type: "timeline", icon: Clock, label: "Timeline", category: "template", keywords: "storia date" },
  { type: "comparison_table", icon: Table, label: "Tabella di confronto", category: "template", keywords: "tabella pricing" },
  { type: "product", icon: Package, label: "Prodotto correlato", category: "template", keywords: "shop prodotto" },
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
    case "single_cta": return { title: "", body: "", ctas: [{ label: "", href: "", style: "default" }], ctaGroupStyle: "boxed", align: "center" } satisfies NewsSingleCtaData;
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
  // Picker (step 1 + 2 + 3): modal centrato con search, tab di categoria,
  // posizione di inserimento (null = append in fondo).
  const [menuOpen, setMenuOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<PickerCategory>("template");

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

  // Chiusura modal con Esc
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  const openPicker = (at: number | null) => {
    setInsertAt(at);
    setSearch("");
    setActiveTab("template");
    setMenuOpen(true);
  };
  const closeMenu = () => {
    setMenuOpen(false);
    setInsertAt(null);
    setSearch("");
  };
  const add = (t: NewsBlockV2Type) => {
    const block: NewsBlockV2 = { id: crypto.randomUUID(), type: t, data: defaultData(t) };
    const next = [...blocks];
    const idx = insertAt === null ? blocks.length : Math.max(0, Math.min(insertAt, blocks.length));
    next.splice(idx, 0, block);
    commit(next);
    closeMenu();
  };
  const upd = (id: string, d: NewsBlockV2["data"]) => commit(blocks.map((b) => b.id === id ? { ...b, data: d } : b));
  const del = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const duplicate = (i: number) => {
    const src = blocks[i];
    if (!src) return;
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
      case "single_cta": return <SingleCtaEditor data={b.data as NewsSingleCtaData} onChange={(d) => upd(b.id, d)} sourceData={src?.data as Partial<NewsSingleCtaData> | undefined} />;
      case "product": return <ProductEditor data={b.data as NewsProductData} onChange={(d) => upd(b.id, d)} />;
      case "share": return <ShareInfo />;
      case "related": return <RelatedInfo />;
    }
  };

  // Slot di inserimento hover tra/sopra blocchi: linea tratteggiata + "+"
  // visibili solo al passaggio mouse. Click → apre il picker pre-impostando
  // la posizione di inserimento.
  const HoverInsert = ({ at }: { at: number }) => (
    <div className="group relative h-3 -my-2.5 z-10">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="flex-1 border-t border-dashed border-warm-400" />
        <button
          type="button"
          onClick={() => openPicker(at)}
          className="pointer-events-auto inline-flex items-center justify-center w-7 h-7 rounded-full bg-warm-800 text-white shadow-md hover:bg-warm-900"
          title="Aggiungi sezione qui"
          aria-label="Aggiungi sezione qui"
        >
          <Plus size={14} />
        </button>
        <div className="flex-1 border-t border-dashed border-warm-400" />
      </div>
    </div>
  );

  // Filtra le voci visibili nel picker: se c'è una query di ricerca, ignora i
  // tab e cerca per label + keywords. Altrimenti mostra solo la categoria attiva.
  const q = search.trim().toLowerCase();
  const visibleItems = q
    ? MENU.filter((m) => `${m.label} ${m.keywords || ""}`.toLowerCase().includes(q))
    : MENU.filter((m) => m.category === activeTab);

  return (
    <div className="space-y-6">
      {blocks.length > 0 && <HoverInsert at={0} />}
      {blocks.map((b, i) => {
        const isC = collapsed.has(b.id);
        const menuItem = MENU.find((m) => m.type === b.type);
        const Icon = menuItem?.icon;
        return (
          <div key={b.id}>
            <div className="bg-white rounded-xl shadow-md border-l-4 border-l-warm-800 border-t border-r border-b border-warm-200 overflow-hidden">
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
            <HoverInsert at={i + 1} />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => openPicker(null)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 rounded-xl text-sm text-warm-500 hover:border-warm-400 hover:text-warm-700 hover:bg-warm-50"
      >
        <Plus size={16} />Aggiungi sezione
      </button>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16"
          onClick={closeMenu}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-warm-200 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: titolo + ricerca + tabs */}
            <div className="px-5 pt-4 pb-3 border-b border-warm-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-warm-800">
                  Aggiungi sezione
                  {insertAt !== null && insertAt < blocks.length && (
                    <span className="ml-2 text-xs font-normal text-warm-500">
                      (prima del blocco #{String(insertAt + 1).padStart(2, "0")})
                    </span>
                  )}
                </h3>
                <button type="button" onClick={closeMenu} className="ml-auto p-1.5 rounded hover:bg-warm-100 text-warm-500" aria-label="Chiudi"><X size={16} /></button>
              </div>
              <div className="relative mt-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  type="search"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca…"
                  className="w-full border border-warm-300 rounded pl-9 pr-3 py-2 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                />
              </div>
              {!q && (
                <div className="flex gap-1 mt-3 -mb-px">
                  {(["template", "widget", "layout"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wider border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-warm-800 text-warm-900"
                          : "border-transparent text-warm-500 hover:text-warm-700"
                      }`}
                    >
                      {tab === "widget" ? "Widget" : tab === "layout" ? "Layout" : "Template"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Grid risultati */}
            <div className="overflow-y-auto p-3 flex-1">
              {visibleItems.length === 0 ? (
                !q && activeTab === "layout" ? (
                  <div className="py-12 text-center text-warm-400 text-sm">
                    Colonne e spaziatori in arrivo nel prossimo step.
                  </div>
                ) : (
                  <div className="py-12 text-center text-warm-400 text-sm">Nessun risultato.</div>
                )
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {visibleItems.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.type}
                        type="button"
                        onClick={() => add(m.type)}
                        className="flex flex-col items-center gap-2 px-3 py-4 border border-warm-200 rounded-lg bg-white text-warm-700 hover:border-warm-400 hover:bg-warm-50 hover:text-warm-900 transition-colors"
                      >
                        <Icon size={22} />
                        <span className="text-xs font-medium text-center leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
