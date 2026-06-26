"use client";

import { useState } from "react";
import { X, Settings as SettingsIcon, Sliders, RotateCcw, Search } from "lucide-react";
import ImageUploadField from "../ImageUploadField";
import SeoPanel from "../SeoPanel";
import { TInput } from "../TranslatableField";
import type {
  NewsBlockV2, NewsBlockStyle, NewsBlockSpacing, NewsBlockBackground, NewsBlockFont, NewsBlockAnimation,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
  NewsImageWithParagraphData, NewsFullwidthBannerData, NewsProductData,
  NewsCaslonTitleData, NewsTwoImagesInlineData,
  NewsFeatureToolData, NewsSingleCtaData, NewsCardsRowData, NewsFaqData, NewsStatsData,
  NewsQuoteData, NewsTimelineData, NewsComparisonTableData, NewsColumnsData,
} from "@/types";
import {
  ParagraphEditor, ImageTextBgEditor, ThreeImagesEditor, SingleImageEditor,
  ImageWithParagraphEditor, FullwidthBannerEditor, ProductEditor, ShareInfo, RelatedInfo,
  CaslonTitleEditor, TwoImagesInlineEditor, ColumnsEditor,
  FeatureToolEditor, SingleCtaEditor, CardsRowEditor, FaqEditor, StatsEditor,
  QuoteEditor, TimelineEditor, ComparisonTableEditor,
} from "./NewsBlockEditors";

// ── Opzioni style ───────────────────────────────────────
const SPACING_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" }, { value: "none", label: "Nessuno" },
  { value: "sm", label: "Piccolo" }, { value: "md", label: "Medio" },
  { value: "lg", label: "Grande" }, { value: "xl", label: "Extra grande" },
];
const BG_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" }, { value: "transparent", label: "Trasparente" },
  { value: "white", label: "Bianco" }, { value: "warm-50", label: "Crema" },
  { value: "warm-100", label: "Crema scuro" }, { value: "warm-900", label: "Scuro" },
];
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default (Work Sans)" },
  { value: "caslon", label: "Libre Caslon" }, { value: "work-sans", label: "Work Sans" },
  { value: "inter", label: "Inter" }, { value: "playfair", label: "Playfair Display" },
  { value: "lora", label: "Lora" }, { value: "montserrat", label: "Montserrat" },
  { value: "roboto", label: "Roboto" }, { value: "poppins", label: "Poppins" },
];
const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "", label: "Default" }, { value: "black", label: "Nero" }, { value: "white", label: "Bianco" },
  { value: "warm-900", label: "Scuro" }, { value: "warm-700", label: "Antracite" }, { value: "warm-500", label: "Grigio" },
];
const ANIMATION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Nessuna" }, { value: "fade-in", label: "Dissolvenza" },
  { value: "slide-up", label: "Sale dal basso" }, { value: "slide-down", label: "Scende dall'alto" },
  { value: "slide-left", label: "Scivola da destra" }, { value: "slide-right", label: "Scivola da sinistra" },
  { value: "zoom-in", label: "Zoom in" },
];

export interface CategoryOption { id: string; value: string; label: string }
export interface PageFormData {
  title: string; subtitle: string; slug: string; imageUrl: string; category: string;
  publishedAt: string; isActive: boolean; tags: string;
  source: string; sourceUrl: string;
  seoTitle: string; seoDescription: string; seoKeywords: string;
  content: string;
}

interface Props {
  selectedBlock: NewsBlockV2 | null;
  onCloseSelection: () => void;
  onBlockDataChange: (data: NewsBlockV2["data"]) => void;
  onBlockStyleChange: (style: NewsBlockStyle | null) => void;
  sourceBlock?: NewsBlockV2;
  // Page-level
  form: PageFormData;
  updateField: (field: string, value: string | number | boolean) => void;
  handleTitleChange: (title: string) => void;
  categories: CategoryOption[];
  CATEGORY_LABELS: Record<string, string>;
  // Tag helpers
  newTag: string;
  setNewTag: (s: string) => void;
  addTag: () => void;
  removeTag: (t: string) => void;
}

export default function NewsRightPanel(props: Props) {
  const { selectedBlock, onCloseSelection } = props;
  const [blockTab, setBlockTab] = useState<"content" | "style">("content");
  // Quando cambia il blocco selezionato, torna sul tab content
  // (semplice useState reset via key non serve perché il tab è cosmetico).

  if (!selectedBlock) {
    return <PagePanel {...props} />;
  }

  return (
    <div className="h-full flex flex-col">
      <BlockHeader block={selectedBlock} onClose={onCloseSelection} />
      <div className="flex border-b border-warm-200 bg-white shrink-0">
        <TabButton active={blockTab === "content"} onClick={() => setBlockTab("content")}>Contenuto</TabButton>
        <TabButton active={blockTab === "style"} onClick={() => setBlockTab("style")}>Stile</TabButton>
      </div>
      <div className="flex-1 overflow-y-auto bg-warm-50">
        {blockTab === "content"
          ? <BlockContentTab block={selectedBlock} sourceBlock={props.sourceBlock} onChange={props.onBlockDataChange} />
          : <BlockStyleTab style={selectedBlock.style} onChange={props.onBlockStyleChange} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs uppercase tracking-wider border-b-2 transition-colors ${
        active ? "border-warm-800 text-warm-900 font-semibold" : "border-transparent text-warm-500 hover:text-warm-700"
      }`}
    >
      {children}
    </button>
  );
}

function BlockHeader({ block, onClose }: { block: NewsBlockV2; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-warm-200 shrink-0">
      <Sliders size={14} className="text-warm-500" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-warm-500 leading-tight">Blocco selezionato</div>
        <div className="text-sm text-warm-900 font-medium truncate">{labelForType(block.type)}</div>
      </div>
      <button type="button" onClick={onClose} className="p-1 text-warm-500 hover:text-warm-800" title="Deseleziona">
        <X size={14} />
      </button>
    </div>
  );
}

function labelForType(type: string): string {
  const LABELS: Record<string, string> = {
    paragraph: "Paragrafo", image_text_bg: "Immagine + Testo", three_images: "Tre immagini",
    single_image: "Immagine singola", image_with_paragraph: "Immagine + paragrafo centrato",
    fullwidth_banner: "Banner full-width", caslon_title: "Titolo (Caslon)", two_images_inline: "Due foto affiancate",
    feature_tool: "Strumento / Feature", cards_row: "Cards", faq: "FAQ", stats: "Statistiche",
    quote: "Citazione", timeline: "Timeline", comparison_table: "Tabella confronto",
    single_cta: "Pulsante CTA", product: "Prodotto correlato", share: "Condividi",
    related: "Continua a leggere", columns: "Colonne",
  };
  return LABELS[type] || type;
}

// ── Block CONTENT tab: rende l'editor appropriato per il tipo di blocco ─
function BlockContentTab({ block, sourceBlock, onChange }: {
  block: NewsBlockV2;
  sourceBlock?: NewsBlockV2;
  onChange: (d: NewsBlockV2["data"]) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceData = sourceBlock?.data as any;
  return (
    <div className="p-4">
      {(() => {
        switch (block.type) {
          case "paragraph": return <ParagraphEditor data={block.data as NewsParagraphData} onChange={onChange} sourceData={sourceData} />;
          case "image_text_bg": return <ImageTextBgEditor data={block.data as NewsImageTextBgData} onChange={onChange} sourceData={sourceData} />;
          case "three_images": return <ThreeImagesEditor data={block.data as NewsThreeImagesData} onChange={onChange} sourceData={sourceData} />;
          case "single_image": return <SingleImageEditor data={block.data as NewsSingleImageData} onChange={onChange} sourceData={sourceData} />;
          case "image_with_paragraph": return <ImageWithParagraphEditor data={block.data as NewsImageWithParagraphData} onChange={onChange} sourceData={sourceData} />;
          case "fullwidth_banner": return <FullwidthBannerEditor data={block.data as NewsFullwidthBannerData} onChange={onChange} sourceData={sourceData} />;
          case "caslon_title": return <CaslonTitleEditor data={block.data as NewsCaslonTitleData} onChange={onChange} sourceData={sourceData} />;
          case "two_images_inline": return <TwoImagesInlineEditor data={block.data as NewsTwoImagesInlineData} onChange={onChange} sourceData={sourceData} />;
          case "feature_tool": return <FeatureToolEditor data={block.data as NewsFeatureToolData} onChange={onChange} sourceData={sourceData} />;
          case "cards_row": return <CardsRowEditor data={block.data as NewsCardsRowData} onChange={onChange} sourceData={sourceData} />;
          case "faq": return <FaqEditor data={block.data as NewsFaqData} onChange={onChange} sourceData={sourceData} />;
          case "stats": return <StatsEditor data={block.data as NewsStatsData} onChange={onChange} sourceData={sourceData} />;
          case "quote": return <QuoteEditor data={block.data as NewsQuoteData} onChange={onChange} sourceData={sourceData} />;
          case "timeline": return <TimelineEditor data={block.data as NewsTimelineData} onChange={onChange} sourceData={sourceData} />;
          case "comparison_table": return <ComparisonTableEditor data={block.data as NewsComparisonTableData} onChange={onChange} sourceData={sourceData} />;
          case "single_cta": return <SingleCtaEditor data={block.data as NewsSingleCtaData} onChange={onChange} sourceData={sourceData} />;
          case "product": return <ProductEditor data={block.data as NewsProductData} onChange={onChange} />;
          case "columns": return <ColumnsEditor data={block.data as NewsColumnsData} onChange={onChange} />;
          case "share": return <ShareInfo />;
          case "related": return <RelatedInfo />;
          default: return null;
        }
      })()}
    </div>
  );
}

// ── Block STYLE tab ────────────────────────────────────
function BlockStyleTab({ style, onChange }: {
  style: NewsBlockStyle | undefined;
  onChange: (s: NewsBlockStyle | null) => void;
}) {
  const patch = (p: Partial<NewsBlockStyle>) => {
    const merged: NewsBlockStyle = { ...(style || {}), ...p };
    const cleaned: NewsBlockStyle = {};
    (Object.keys(merged) as (keyof NewsBlockStyle)[]).forEach((k) => {
      const v = merged[k];
      if (v !== undefined && v !== "") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cleaned as any)[k] = v;
      }
    });
    onChange(Object.keys(cleaned).length === 0 ? null : cleaned);
  };
  const has = style && Object.keys(style).length > 0;
  return (
    <div className="p-4 space-y-5">
      {has && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 text-[11px] text-warm-500 hover:text-warm-800"
        >
          <RotateCcw size={11} /> Ripristina default
        </button>
      )}
      <Section title="Spaziatura">
        <StyleSelect label="Margine sopra" value={style?.marginTop} options={SPACING_OPTIONS} onChange={(v) => patch({ marginTop: v as NewsBlockSpacing | undefined })} />
        <StyleSelect label="Margine sotto" value={style?.marginBottom} options={SPACING_OPTIONS} onChange={(v) => patch({ marginBottom: v as NewsBlockSpacing | undefined })} />
        <StyleSelect label="Padding sopra" value={style?.paddingTop} options={SPACING_OPTIONS} onChange={(v) => patch({ paddingTop: v as NewsBlockSpacing | undefined })} />
        <StyleSelect label="Padding sotto" value={style?.paddingBottom} options={SPACING_OPTIONS} onChange={(v) => patch({ paddingBottom: v as NewsBlockSpacing | undefined })} />
      </Section>
      <Section title="Sfondo">
        <StyleSelect label="Preset" value={style?.background} options={BG_OPTIONS} onChange={(v) => patch({ background: v as NewsBlockBackground | undefined })} />
        <StyleColorInput label="Sfondo (hex)" value={style?.backgroundCustom} onChange={(v) => patch({ backgroundCustom: v || undefined })} />
      </Section>
      <Section title="Tipografia">
        <StyleSelect label="Font" value={style?.textFont} options={FONT_OPTIONS} onChange={(v) => patch({ textFont: v as NewsBlockFont | undefined })} />
      </Section>
      <Section title="Colore testo">
        <StyleSelect label="Preset" value={style?.textColor} options={COLOR_PRESETS} onChange={(v) => patch({ textColor: v || undefined })} />
        <StyleColorInput label="Colore (hex)" value={style?.textColorCustom} onChange={(v) => patch({ textColorCustom: v || undefined })} />
      </Section>
      <Section title="Animazione di entrata">
        <StyleSelect label="Tipo" value={style?.animation} options={ANIMATION_OPTIONS} onChange={(v) => patch({ animation: v as NewsBlockAnimation | undefined })} />
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Ritardo (ms)</span>
          <input
            type="number" min={0} max={3000} step={50}
            value={style?.animationDelay ?? ""}
            onChange={(e) => {
              const n = e.target.value === "" ? undefined : Math.max(0, Math.min(3000, parseInt(e.target.value, 10) || 0));
              patch({ animationDelay: n });
            }}
            placeholder="0"
            className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </label>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-warm-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-warm-500 font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function StyleSelect({
  label, value, options, onChange,
}: { label: string; value: string | undefined; options: { value: string; label: string }[]; onChange: (v: string | undefined) => void }) {
  return (
    <label className="block col-span-1">
      <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function StyleColorInput({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  const v = value || "";
  return (
    <label className="block col-span-1">
      <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 border border-warm-300 rounded cursor-pointer p-0.5 bg-white shrink-0"
          aria-label={label}
        />
        <input
          type="text" value={v}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="#hex"
          className="flex-1 min-w-0 border border-warm-300 rounded px-2 py-1.5 text-xs bg-white focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
        {v && (
          <button type="button" onClick={() => onChange(undefined)} className="p-1 text-warm-400 hover:text-warm-800 shrink-0" title="Rimuovi">
            <X size={11} />
          </button>
        )}
      </div>
    </label>
  );
}

// ── PAGE panel (no block selected) ────────────────────────
function PagePanel(props: Props) {
  const { form, updateField, handleTitleChange, categories, CATEGORY_LABELS, newTag, setNewTag, addTag, removeTag } = props;
  const [seoOpen, setSeoOpen] = useState(false);
  const tags: string[] = (() => { try { return JSON.parse(form.tags); } catch { return []; } })();
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-warm-200 shrink-0">
        <SettingsIcon size={14} className="text-warm-500" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-warm-500 leading-tight">Impostazioni</div>
          <div className="text-sm text-warm-900 font-medium">Pagina</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-warm-50 p-4 space-y-4">
        <Section title="Categoria">
          <label className="block col-span-2">
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white"
            >
              {form.category && !categories.find((c) => c.value === form.category) && (
                <option value={form.category}>{CATEGORY_LABELS[form.category] || form.category}</option>
              )}
              {categories.length === 0 && !form.category && <option value="">— seleziona categoria —</option>}
              {categories.map((c) => <option key={c.id} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </Section>
        <Section title="Identità articolo">
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Titolo *</span>
            <TInput fieldKey="title" defaultValue={form.title} onDefaultChange={handleTitleChange} className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
          </label>
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Sottotitolo</span>
            <TInput fieldKey="subtitle" defaultValue={form.subtitle} onDefaultChange={(v) => updateField("subtitle", v)} className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
          </label>
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Slug</span>
            <TInput fieldKey="slug" defaultValue={form.slug} onDefaultChange={(v) => updateField("slug", v)} className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-warm-50" />
          </label>
        </Section>
        <Section title="Immagine di copertina">
          <div className="col-span-2">
            <ImageUploadField label="" value={form.imageUrl} onChange={(url) => updateField("imageUrl", url)} onRemove={() => updateField("imageUrl", "")} purpose="cover" folder="news" aspectRatio={1} />
          </div>
        </Section>
        <Section title="Pubblicazione">
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Data</span>
            <input type="datetime-local" value={form.publishedAt} onChange={(e) => updateField("publishedAt", e.target.value)} className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
          </label>
          <label className="flex items-center gap-2 cursor-pointer col-span-2 mt-1">
            <input type="checkbox" checked={form.isActive} onChange={(e) => updateField("isActive", e.target.checked)} className="w-4 h-4 rounded border-warm-300 text-warm-800 focus:ring-warm-800" />
            <span className="text-xs text-warm-700">Attivo (visibile sul sito)</span>
          </label>
        </Section>
        <Section title="Tag">
          <div className="col-span-2">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-100 text-warm-700 text-[11px] rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-600"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="aggiungi…" className="flex-1 border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
              <button type="button" onClick={addTag} className="px-2.5 py-1.5 text-xs bg-warm-100 text-warm-700 rounded hover:bg-warm-200">+</button>
            </div>
          </div>
        </Section>
        <Section title="Fonte (opzionale)">
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">Fonte</span>
            <input type="text" value={form.source} onChange={(e) => updateField("source", e.target.value)} placeholder="es. Corriere della Sera" className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
          </label>
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-wider text-warm-500 mb-1">URL fonte</span>
            <input type="text" value={form.sourceUrl} onChange={(e) => updateField("sourceUrl", e.target.value)} placeholder="https://…" className="w-full border border-warm-300 rounded px-2 py-1.5 text-xs bg-white" />
          </label>
        </Section>
        <div className="bg-white border border-warm-200 rounded-lg">
          <button
            type="button"
            onClick={() => setSeoOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-warm-50 transition-colors"
          >
            <span className="text-[10px] uppercase tracking-wider text-warm-600 font-semibold inline-flex items-center gap-1.5">
              <Search size={11} /> SEO
            </span>
            <span className="text-warm-400 text-lg leading-none">{seoOpen ? "−" : "+"}</span>
          </button>
          {seoOpen && (
            <div className="px-3 pb-3 border-t border-warm-200 pt-3">
              <SeoPanel
                seoTitle={form.seoTitle}
                seoDescription={form.seoDescription}
                seoKeywords={(() => { try { return JSON.parse(form.seoKeywords); } catch { return []; } })()}
                slug={form.slug}
                content={form.content || ""}
                onChange={(field, value) => {
                  if (field === "seoKeywords") props.updateField("seoKeywords", JSON.stringify(value));
                  else props.updateField(field, value as string);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
