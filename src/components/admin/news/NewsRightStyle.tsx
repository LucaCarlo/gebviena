"use client";

import { X, Settings as SettingsIcon, Sliders, RotateCcw, Search } from "lucide-react";
import SeoPanel from "../SeoPanel";
import type {
  NewsBlockV2, NewsBlockStyle, NewsBlockSpacing, NewsBlockBackground, NewsBlockFont, NewsBlockAnimation,
} from "@/types";

// Opzioni style (duplicate dal NewsBlockBuilder per indipendenza del pannello)
const SPACING_OPTIONS = [
  { value: "", label: "Default" }, { value: "none", label: "Nessuno" },
  { value: "sm", label: "Piccolo" }, { value: "md", label: "Medio" },
  { value: "lg", label: "Grande" }, { value: "xl", label: "Extra grande" },
];
const BG_OPTIONS = [
  { value: "", label: "Default" }, { value: "transparent", label: "Trasparente" },
  { value: "white", label: "Bianco" }, { value: "warm-50", label: "Crema" },
  { value: "warm-100", label: "Crema scuro" }, { value: "warm-900", label: "Scuro" },
];
const FONT_OPTIONS = [
  { value: "", label: "Default (Work Sans)" },
  { value: "caslon", label: "Libre Caslon" }, { value: "work-sans", label: "Work Sans" },
  { value: "inter", label: "Inter" }, { value: "playfair", label: "Playfair Display" },
  { value: "lora", label: "Lora" }, { value: "montserrat", label: "Montserrat" },
  { value: "roboto", label: "Roboto" }, { value: "poppins", label: "Poppins" },
];
const COLOR_PRESETS = [
  { value: "", label: "Default" }, { value: "black", label: "Nero" }, { value: "white", label: "Bianco" },
  { value: "warm-900", label: "Scuro" }, { value: "warm-700", label: "Antracite" }, { value: "warm-500", label: "Grigio" },
];
const ANIMATION_OPTIONS = [
  { value: "", label: "Nessuna" }, { value: "fade-in", label: "Dissolvenza" },
  { value: "slide-up", label: "Sale dal basso" }, { value: "slide-down", label: "Scende dall'alto" },
  { value: "slide-left", label: "Scivola da destra" }, { value: "slide-right", label: "Scivola da sinistra" },
  { value: "zoom-in", label: "Zoom in" },
];

interface Props {
  selectedBlock: NewsBlockV2 | null;
  onCloseSelection: () => void;
  onBlockStyleChange: (style: NewsBlockStyle | null) => void;
  // SEO (mostrato quando nessun blocco selezionato)
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  slug: string;
  content: string;
  onSeoChange: (field: string, value: string | string[]) => void;
}

const LABELS: Record<string, string> = {
  paragraph: "Paragrafo", image_text_bg: "Immagine + Testo", three_images: "Tre immagini",
  single_image: "Immagine singola", image_with_paragraph: "Immagine + paragrafo centrato",
  fullwidth_banner: "Banner full-width", caslon_title: "Titolo (Caslon)", two_images_inline: "Due foto affiancate",
  feature_tool: "Strumento / Feature", cards_row: "Cards", faq: "FAQ", stats: "Statistiche",
  quote: "Citazione", timeline: "Timeline", comparison_table: "Tabella confronto",
  single_cta: "Pulsante CTA", product: "Prodotto correlato", share: "Condividi",
  related: "Continua a leggere", columns: "Colonne",
};

export default function NewsRightStyle({
  selectedBlock, onCloseSelection, onBlockStyleChange,
  seoTitle, seoDescription, seoKeywords, slug, content, onSeoChange,
}: Props) {
  if (!selectedBlock) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-warm-200 shrink-0">
          <Search size={14} className="text-warm-500" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-warm-500 leading-tight">Pannello generale</div>
            <div className="text-sm text-warm-900 font-medium">SEO</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-warm-50 p-4">
          <div className="bg-white border border-warm-200 rounded-lg p-3">
            <SeoPanel
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              seoKeywords={seoKeywords}
              slug={slug}
              content={content || ""}
              onChange={(field, value) => onSeoChange(field, value)}
            />
          </div>
          <p className="text-[11px] text-warm-400 mt-3 text-center">
            Clicca l&apos;icona <SettingsIcon size={11} className="inline align-text-bottom" /> su un blocco per modificarne lo stile qui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-warm-200 shrink-0">
        <Sliders size={14} className="text-warm-500" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-warm-500 leading-tight">Stile</div>
          <div className="text-sm text-warm-900 font-medium truncate">{LABELS[selectedBlock.type] || selectedBlock.type}</div>
        </div>
        <button type="button" onClick={onCloseSelection} className="p-1 text-warm-500 hover:text-warm-800" title="Chiudi">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-warm-50">
        <StyleEditor style={selectedBlock.style} onChange={onBlockStyleChange} />
      </div>
    </div>
  );
}

function StyleEditor({ style, onChange }: { style: NewsBlockStyle | undefined; onChange: (s: NewsBlockStyle | null) => void }) {
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
    <div className="p-4 space-y-4">
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
        <label className="block col-span-1">
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
      <Section title="Immagine">
        <StyleSelect
          label="Adattamento"
          value={style?.imageFit}
          options={[
            { value: "", label: "Default (Cover)" },
            { value: "cover", label: "Riempi (taglia)" },
            { value: "contain", label: "Adatta (intera)" },
          ]}
          onChange={(v) => patch({ imageFit: (v as "cover" | "contain" | undefined) })}
        />
        <StyleSelect
          label="Sfondo immagine"
          value={style?.imageBg}
          options={[
            { value: "", label: "Default" },
            { value: "none", label: "Nessuno" },
          ]}
          onChange={(v) => patch({ imageBg: (v as "default" | "none" | undefined) })}
        />
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
