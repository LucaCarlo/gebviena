"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import ImageUploadField from "../ImageUploadField";
import { BlockTextInput, BlockRichText } from "./BlockAIField";
import type {
  NewsParagraphData,
  NewsImageTextBgData,
  NewsThreeImagesData,
  NewsSingleImageData,
  NewsImageWithParagraphData,
  NewsFullwidthBannerData,
  NewsCaslonTitleData,
  NewsTwoImagesInlineData,
  NewsProductData,
  NewsFeatureToolData,
  NewsSingleCtaData,
  NewsCardsRowData,
  NewsFaqData,
  NewsStatsData,
  NewsQuoteData,
  NewsTimelineData,
  NewsComparisonTableData,
  NewsCardItem,
  NewsCta,
  CtaButtonStyle,
} from "@/types";

// Helper: l'URL punta a un file video (mp4/webm/...) tra quelli caricabili dal
// MediaUploadField? In quel caso mostriamo la checkbox autoplay.
function isUploadedVideo(url: string | undefined | null): boolean {
  return !!url && /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

interface VideoToggleProps {
  autoplay: boolean;
  controls: boolean;
  onAutoplay: (v: boolean) => void;
  onControls: (v: boolean) => void;
}

function VideoPlaybackToggle({ autoplay, controls, onAutoplay, onControls }: VideoToggleProps) {
  return (
    <div className="p-3 border border-warm-200 rounded bg-warm-50/50 space-y-2">
      <div className="text-[11px] font-semibold text-warm-600 uppercase tracking-wider">Opzioni video</div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(e) => onAutoplay(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-warm-800"
        />
        <div>
          <div className="text-sm font-medium text-warm-800">Avvia in automatico</div>
          <div className="text-[11px] text-warm-500 mt-0.5">
            Il video parte da solo, in loop e senza audio (richiesto dal browser per l&rsquo;autoplay).
          </div>
        </div>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={controls}
          onChange={(e) => onControls(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-warm-800"
        />
        <div>
          <div className="text-sm font-medium text-warm-800">Mostra barra controlli</div>
          <div className="text-[11px] text-warm-500 mt-0.5">
            Play/pausa, volume e schermo intero visibili al visitatore. Si combina con &laquo;Avvia in automatico&raquo;: parte da solo ma con la barra disponibile.
          </div>
        </div>
      </label>
    </div>
  );
}

function CtaFields({ label, href, sourceLabel, onLabel, onHref }: { label: string; href: string; sourceLabel?: string; onLabel: (v: string) => void; onHref: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const uploadPdf = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "documents");
      fd.append("skipCompression", "true");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      const url = data?.data?.url || data?.url;
      if (data.success && url) onHref(url);
      else alert(data?.error || "Upload PDF fallito");
    } finally { setUploading(false); }
  };
  const isPdf = /\.pdf($|\?)/i.test(href);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — etichetta (opzionale)</label>
        <BlockTextInput value={label} onChange={onLabel} sourceText={sourceLabel} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — link o PDF</label>
        <div className="flex gap-2">
          <input type="text" value={href} onChange={(e) => onHref(e.target.value)} placeholder="/mondo-gtv/heritage oppure carica un PDF" className="flex-1 border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          <label className="px-3 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-xs font-medium rounded cursor-pointer whitespace-nowrap flex items-center">
            {uploading ? "..." : "PDF"}
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); e.target.value = ""; }} />
          </label>
        </div>
        {isPdf && <p className="text-[10px] text-warm-500 mt-1">Verra scaricato (attributo download).</p>}
      </div>
    </div>
  );
}

interface ProductOption { id: string; name: string; slug: string; imageUrl: string; coverImage: string | null; }

let productsCache: ProductOption[] | null = null;
let productsPromise: Promise<ProductOption[]> | null = null;
function loadProducts(): Promise<ProductOption[]> {
  if (productsCache) return Promise.resolve(productsCache);
  if (!productsPromise) {
    productsPromise = fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((d) => { productsCache = d.data || []; return productsCache!; })
      .catch(() => []);
  }
  return productsPromise;
}

export function ParagraphEditor({ data, onChange, sourceData }: { data: NewsParagraphData; onChange: (d: NewsParagraphData) => void; sourceData?: Partial<NewsParagraphData> }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <BlockRichText value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} sourceText={sourceData?.title || ""} placeholder="Titolo paragrafo" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo</label>
        <BlockRichText value={data.body || ""} onChange={(html) => onChange({ ...data, body: html })} sourceText={sourceData?.body || ""} multiline minHeight={140} />
      </div>
    </div>
  );
}

export function ImageTextBgEditor({ data, onChange, sourceData }: { data: NewsImageTextBgData; onChange: (d: NewsImageTextBgData) => void; sourceData?: Partial<NewsImageTextBgData> }) {
  const bg = data.background || "warm";
  const fit = data.mediaFit || "cover";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Posizione immagine</label>
          <div className="flex gap-2">
            {(["left", "right"] as const).map((pos) => (
              <button key={pos} type="button" onClick={() => onChange({ ...data, imagePosition: pos })}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${data.imagePosition === pos ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"}`}>
                {pos === "left" ? "Sinistra" : "Destra"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Sfondo sezione</label>
          <div className="flex gap-2 flex-wrap">
            {([
              { v: "warm", l: "Beige (default)" },
              { v: "white", l: "Bianco" },
              { v: "transparent", l: "Trasparente" },
            ] as const).map((o) => (
              <button key={o.v} type="button" onClick={() => onChange({ ...data, background: o.v })}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${bg === o.v ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Adattamento media</label>
        <div className="flex gap-2 flex-wrap">
          {([
            { v: "cover", l: "Riempi tutto (taglia)", h: "Il media riempie l'intera colonna senza margini. Va tagliato per adattarsi." },
            { v: "contain", l: "Mostra tutto (con margini)", h: "Il media viene mostrato per intero, con margini ai lati se l'aspect non combacia. Utile per loghi o foto da NON tagliare." },
          ] as const).map((o) => (
            <button key={o.v} type="button" onClick={() => onChange({ ...data, mediaFit: o.v })} title={o.h}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${fit === o.v ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"}`}>
              {o.l}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-warm-400 mt-1">
          {fit === "cover" ? "Il media riempie tutta la colonna (potrebbe essere tagliato sui lati)." : "Il media viene mostrato per intero, con spazio attorno se necessario."}
        </p>
      </div>

      <ImageUploadField label="Immagine o video"
        value={data.imageUrl}
        onChange={(url) => onChange({ ...data, imageUrl: url })}
        onRemove={() => onChange({ ...data, imageUrl: "" })}
        purpose="general" folder="news" acceptVideo
        helpText="Risoluzione consigliata: 1200x1600px (verticale 3:4) o 1600x1200px (orizzontale 4:3). Min 1000px sul lato lungo."
      />
      {(isUploadedVideo(data.imageUrl) || isUploadedVideo(data.videoUrl)) && (
        <VideoPlaybackToggle autoplay={!!data.videoAutoplay} controls={data.videoControls !== false} onAutoplay={(v) => onChange({ ...data, videoAutoplay: v })} onControls={(v) => onChange({ ...data, videoControls: v })} />
      )}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">&hellip;oppure URL video esterno (YouTube, Vimeo)</label>
        <input type="text" value={data.videoUrl || ""} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        <p className="text-[10px] text-warm-400 mt-1">Se compilato, al posto dell&apos;immagine viene mostrato il video YouTube/Vimeo.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <BlockRichText value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} sourceText={sourceData?.title || ""} placeholder="Titolo sezione" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo</label>
        <BlockRichText value={data.text || ""} onChange={(html) => onChange({ ...data, text: html })} sourceText={sourceData?.text || ""} multiline minHeight={140} />
      </div>
      <CtaFields label={data.ctaLabel || ""} href={data.ctaHref || ""} sourceLabel={sourceData?.ctaLabel || ""} onLabel={(v) => onChange({ ...data, ctaLabel: v })} onHref={(v) => onChange({ ...data, ctaHref: v })} />

      {/* Stile CTA — possibilita di sostituire il testo del pulsante con un'icona
          SVG/PNG (utile per loghi store, brand icons cliccabili). */}
      <div className="border border-warm-200 bg-warm-50/30 rounded p-3 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Stile pulsante</span>
          <select
            value={data.ctaStyle || "default"}
            onChange={(e) => onChange({ ...data, ctaStyle: e.target.value as CtaButtonStyle })}
            className="border border-warm-300 rounded px-2 py-1 text-xs focus:border-warm-800 focus:outline-none bg-white"
          >
            {CTA_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {data.ctaStyle === "custom" && (
          <ImageUploadField
            label="Icona SVG/PNG"
            value={data.ctaIconUrl || ""}
            onChange={(url) => onChange({ ...data, ctaIconUrl: url })}
            onRemove={() => onChange({ ...data, ctaIconUrl: "" })}
            purpose="general"
            folder="news"
            helpText="SVG quadrato 24x24px o 32x32px, viewBox riempito senza padding. PNG: minimo 64x64px sfondo trasparente."
          />
        )}
      </div>
    </div>
  );
}

export function ThreeImagesEditor({ data, onChange, sourceData }: { data: NewsThreeImagesData; onChange: (d: NewsThreeImagesData) => void; sourceData?: Partial<NewsThreeImagesData> }) {
  const imgs = data.images || [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }];
  const update = (i: number, patch: Partial<{ url: string; caption: string; videoUrl: string }>) => {
    const next = imgs.map((im, idx) => (idx === i ? { ...im, ...patch } : im));
    onChange({ images: next });
  };
  return (
    <div className="space-y-4">
      {imgs.slice(0, 3).map((im, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 border-b border-warm-100 last:border-b-0">
          <ImageUploadField label={`Media ${i + 1} (immagine o video)`} value={im.url} onChange={(url) => update(i, { url })} onRemove={() => update(i, { url: "" })} purpose="general" folder="news" aspectRatio={2 / 3} acceptVideo helpText="Risoluzione consigliata: 800x1200px (verticale 2:3). Min 600px sul lato corto." />
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Didascalia</label>
              <BlockTextInput value={im.caption} onChange={(v) => update(i, { caption: v })} sourceText={sourceData?.images?.[i]?.caption || ""} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">URL video esterno (YouTube/Vimeo)</label>
              <input type="text" value={im.videoUrl || ""} onChange={(e) => update(i, { videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full border border-warm-300 rounded px-3 py-2 text-xs focus:border-warm-800 focus:outline-none" />
              <p className="text-[10px] text-warm-400 mt-1">Se compilato, sostituisce immagine/video caricato.</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SingleImageEditor({ data, onChange, sourceData }: { data: NewsSingleImageData; onChange: (d: NewsSingleImageData) => void; sourceData?: Partial<NewsSingleImageData> }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine o video" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" acceptVideo helpText="Risoluzione consigliata: 1600x900px (16:9 orizzontale) o 1200x1200px (quadrato). Min 1000px sul lato lungo. Formati: JPG, PNG, MP4, WebM." />
      {(isUploadedVideo(data.imageUrl) || isUploadedVideo(data.videoUrl)) && (
        <VideoPlaybackToggle autoplay={!!data.videoAutoplay} controls={data.videoControls !== false} onAutoplay={(v) => onChange({ ...data, videoAutoplay: v })} onControls={(v) => onChange({ ...data, videoControls: v })} />
      )}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">…oppure URL video esterno (YouTube, Vimeo)</label>
        <input type="text" value={data.videoUrl || ""} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=... oppure /uploads/video.mp4" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        <p className="text-[10px] text-warm-400 mt-1">Se compilato, al posto dell&apos;immagine viene mostrato il video.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Didascalia (opzionale)</label>
        <BlockTextInput value={data.caption || ""} onChange={(v) => onChange({ ...data, caption: v })} sourceText={sourceData?.caption || ""} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
      </div>
    </div>
  );
}

export function ImageWithParagraphEditor({ data, onChange, sourceData }: { data: NewsImageWithParagraphData; onChange: (d: NewsImageWithParagraphData) => void; sourceData?: Partial<NewsImageWithParagraphData> }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine o video" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" acceptVideo helpText="Risoluzione consigliata: 1200x800px (3:2 orizzontale) o 1200x1200px (quadrato). Min 1000px sul lato lungo." />
      {(isUploadedVideo(data.imageUrl) || isUploadedVideo(data.videoUrl)) && (
        <VideoPlaybackToggle autoplay={!!data.videoAutoplay} controls={data.videoControls !== false} onAutoplay={(v) => onChange({ ...data, videoAutoplay: v })} onControls={(v) => onChange({ ...data, videoControls: v })} />
      )}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">…oppure URL video esterno (YouTube, Vimeo)</label>
        <input type="text" value={data.videoUrl || ""} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=... oppure /uploads/video.mp4" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        <p className="text-[10px] text-warm-400 mt-1">Se compilato, al posto dell&apos;immagine viene mostrato il video.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <BlockRichText value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} sourceText={sourceData?.title || ""} placeholder="Titolo" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Paragrafo (centrato sotto l&apos;immagine/video)</label>
        <BlockRichText value={data.body || ""} onChange={(html) => onChange({ ...data, body: html })} sourceText={sourceData?.body || ""} multiline minHeight={140} />
      </div>
    </div>
  );
}

export function FullwidthBannerEditor({ data, onChange, sourceData }: { data: NewsFullwidthBannerData; onChange: (d: NewsFullwidthBannerData) => void; sourceData?: Partial<NewsFullwidthBannerData> }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine o video (full-width, scuro)" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="hero" folder="news" aspectRatio={1600 / 900} acceptVideo helpText="Risoluzione consigliata: 1920x1080px (16:9 full-width). Min 1600px di larghezza. Il media viene scurito automaticamente per il testo sovrapposto." />
      {(isUploadedVideo(data.imageUrl) || isUploadedVideo(data.videoUrl)) && (
        <VideoPlaybackToggle autoplay={!!data.videoAutoplay} controls={data.videoControls !== false} onAutoplay={(v) => onChange({ ...data, videoAutoplay: v })} onControls={(v) => onChange({ ...data, videoControls: v })} />
      )}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">&hellip;oppure URL video esterno (YouTube, Vimeo)</label>
        <input type="text" value={data.videoUrl || ""} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (sovraimpresso)</label>
        <BlockTextInput value={data.title || ""} onChange={(v) => onChange({ ...data, title: v })} sourceText={sourceData?.title || ""} placeholder="Sedute che invitano a restare, momenti che prendono forma" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
      </div>
      <CtaFields label={data.ctaLabel || ""} href={data.ctaHref || ""} sourceLabel={sourceData?.ctaLabel || ""} onLabel={(v) => onChange({ ...data, ctaLabel: v })} onHref={(v) => onChange({ ...data, ctaHref: v })} />
    </div>
  );
}

export function ProductEditor({ data, onChange }: { data: NewsProductData; onChange: (d: NewsProductData) => void }) {
  const [products, setProducts] = useState<ProductOption[]>(productsCache || []);
  useEffect(() => { loadProducts().then(setProducts); }, []);
  const selected = products.find((p) => p.id === data.productId);
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-warm-400">Sezione a tutta larghezza con immagine del prodotto e link.</p>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Prodotto</label>
        <select
          value={data.productId || ""}
          onChange={(e) => onChange({ productId: e.target.value })}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        >
          <option value="">— Seleziona un prodotto —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="flex items-center gap-3 p-3 bg-warm-50 rounded">
          <div className="relative w-16 h-16 bg-warm-200 rounded overflow-hidden flex-shrink-0">
            {(selected.coverImage || selected.imageUrl) && (
              <Image src={selected.coverImage || selected.imageUrl} alt={selected.name} fill className="object-cover" sizes="64px" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-warm-800">{selected.name}</p>
            <p className="text-xs text-warm-400">/prodotti/{selected.slug}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CaslonTitleEditor({ data, onChange, sourceData }: { data: NewsCaslonTitleData; onChange: (d: NewsCaslonTitleData) => void; sourceData?: Partial<NewsCaslonTitleData> }) {
  const align = data.align || "center";
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo</label>
        <BlockRichText
          value={data.text}
          onChange={(v) => onChange({ ...data, text: v })}
          sourceText={sourceData?.text || ""}
          placeholder="Sezione, sottosezione, frase ad effetto…"
        />
        <p className="text-[10px] text-warm-400 mt-1">
          Font di default <strong>Libre Caslon Text 56px</strong>. Puoi cambiare font / peso / corsivo per singole parole dalla toolbar qui sopra.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Allineamento</label>
        <div className="flex gap-2">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...data, align: a })}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                align === a ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
              }`}
            >
              {a === "left" ? "Sinistra" : a === "center" ? "Centro" : "Destra"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TwoImagesInlineEditor({ data, onChange, sourceData }: { data: NewsTwoImagesInlineData; onChange: (d: NewsTwoImagesInlineData) => void; sourceData?: Partial<NewsTwoImagesInlineData> }) {
  const imgs = data.images && data.images.length >= 2 ? data.images : [{ url: "" }, { url: "" }];
  const align = data.align || "center";
  const updateImg = (i: number, patch: Partial<{ url: string; caption?: string; videoUrl?: string }>) => {
    const next = imgs.map((im, idx) => (idx === i ? { ...im, ...patch } : im));
    onChange({ ...data, images: next });
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Allineamento del gruppo</label>
        <div className="flex gap-2">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...data, align: a })}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                align === a ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
              }`}
            >
              {a === "left" ? "Sbandiera sx" : a === "center" ? "Centrato" : "Sbandiera dx"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <ImageUploadField
              label={`Media ${i + 1} (immagine o video)`}
              value={imgs[i]?.url || ""}
              onChange={(url) => updateImg(i, { url })}
              onRemove={() => updateImg(i, { url: "" })}
              purpose="general"
              folder="news"
              acceptVideo
              helpText="Risoluzione consigliata: 800x1067px (verticale 3:4). Min 600px di larghezza. Mantieni aspect uguale tra le due immagini."
            />
            <div>
              <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wider mb-1">&hellip;oppure URL YouTube/Vimeo</label>
              <input type="text" value={imgs[i]?.videoUrl || ""} onChange={(e) => updateImg(i, { videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Didascalia (opzionale)</label>
        <BlockTextInput
          value={data.caption || ""}
          onChange={(v) => onChange({ ...data, caption: v })}
          sourceText={sourceData?.caption || ""}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          placeholder="Didascalia comune alle due immagini…"
        />
      </div>
    </div>
  );
}

export function ShareInfo() {
  return <p className="text-sm text-warm-500">Mostra in pagina tre voci: <strong>Condividi su Facebook</strong>, <strong>Condividi su X</strong>, <strong>Copia link</strong>.</p>;
}

export function RelatedInfo() {
  return <p className="text-sm text-warm-500">Mostra la sezione fissa <strong>Continua a leggere</strong> con le altre 4 news piu recenti.</p>;
}

/* ─────────────────────────────────────────────────────────────────────────
   NUOVI BLOCK EDITORS (CMS avanzato)
   ───────────────────────────────────────────────────────────────────────── */

const CTA_STYLE_OPTIONS: { value: CtaButtonStyle; label: string }[] = [
  { value: "default", label: "Pulsante normale" },
  { value: "custom",  label: "Personalizzato (icona SVG)" },
];

/* ── FEATURE / STRUMENTO ───────────────────────────────────────────────── */
export function FeatureToolEditor({ data, onChange, sourceData }: { data: NewsFeatureToolData; onChange: (d: NewsFeatureToolData) => void; sourceData?: Partial<NewsFeatureToolData> }) {
  void sourceData;
  const setCtas = (next: NewsCta[]) => onChange({ ...data, ctas: next });
  const addCta = () => setCtas([...(data.ctas || []), { label: "", href: "", style: "default" }]);
  const updCta = (i: number, patch: Partial<NewsCta>) => setCtas((data.ctas || []).map((c, j) => j === i ? { ...c, ...patch } : c));
  const delCta = (i: number) => setCtas((data.ctas || []).filter((_, j) => j !== i));

  const setBullets = (next: string[]) => onChange({ ...data, bullets: next });
  const addBullet = () => setBullets([...(data.bullets || []), ""]);
  const updBullet = (i: number, v: string) => setBullets((data.bullets || []).map((b, j) => j === i ? v : b));
  const delBullet = (i: number) => setBullets((data.bullets || []).filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Posizione immagine</label>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((pos) => (
            <button key={pos} type="button" onClick={() => onChange({ ...data, imagePosition: pos })}
              className={`px-4 py-1.5 rounded text-sm border transition-colors ${data.imagePosition === pos ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"}`}>
              {pos === "left" ? "Immagine a sinistra" : "Immagine a destra"}
            </button>
          ))}
        </div>
      </div>

      <ImageUploadField label="Immagine principale" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" acceptVideo helpText="Risoluzione consigliata: 1200x900px (4:3 orizzontale). Min 1000px di larghezza. JPG/PNG/MP4/WebM." />
      {isUploadedVideo(data.imageUrl) && (
        <VideoPlaybackToggle autoplay={!!data.videoAutoplay} controls={data.videoControls !== false} onAutoplay={(v) => onChange({ ...data, videoAutoplay: v })} onControls={(v) => onChange({ ...data, videoControls: v })} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Logo / icona piccola (opzionale)</label>
          <ImageUploadField label="" value={data.logoUrl || ""} onChange={(url) => onChange({ ...data, logoUrl: url })} onRemove={() => onChange({ ...data, logoUrl: "" })} purpose="general" folder="news" helpText="SVG o PNG quadrato (es. 64x64)" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Etichetta sopra CTA (opzionale)</label>
          <input type="text" value={data.scrollLabel || ""} onChange={(e) => onChange({ ...data, scrollLabel: e.target.value })} placeholder="es. SCARICA PCON.FACTS" className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo *</label>
        <input type="text" value={data.title} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="es. pCon.facts" className="w-full border border-warm-300 rounded px-4 py-2.5 text-base font-semibold text-warm-900 placeholder:text-warm-400 bg-white focus:border-warm-800 focus:outline-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione</label>
        <textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} rows={3} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 bg-white focus:border-warm-800 focus:outline-none" placeholder="Tutte le informazioni di prodotto, sempre con te." />
      </div>

      <div className="border border-warm-200 bg-warm-50/30 rounded p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <input type="text" value={data.bulletsTitle || ""} onChange={(e) => onChange({ ...data, bulletsTitle: e.target.value })} placeholder="IDEALE PER" className="border border-warm-300 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider w-48 bg-white focus:border-warm-800 focus:outline-none" />
          <button type="button" onClick={addBullet} className="text-xs text-warm-700 hover:text-warm-900 underline flex items-center gap-1"><Plus size={12} /> Aggiungi voce</button>
        </div>
        <div className="space-y-1.5">
          {(data.bullets || []).map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-warm-400">&bull;</span>
              <input type="text" value={b} onChange={(e) => updBullet(i, e.target.value)} placeholder="Voce della lista" className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm bg-white focus:border-warm-800 focus:outline-none" />
              <button type="button" onClick={() => delBullet(i)} className="p-1.5 text-warm-400 hover:text-red-600" title="Rimuovi"><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-warm-200 bg-warm-50/30 rounded p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Pulsanti CTA</div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-warm-600 inline-flex items-center gap-1.5">
              Stile:
              <select
                value={data.ctaGroupStyle || "boxed"}
                onChange={(e) => onChange({ ...data, ctaGroupStyle: e.target.value as "boxed" | "icons-text-divider" | "icons-only-divider" })}
                className="border border-warm-300 rounded px-2 py-1 text-xs focus:border-warm-800 focus:outline-none bg-white"
              >
                <option value="boxed">Pulsanti con sfondo</option>
                <option value="icons-text-divider">Icona + testo, senza sfondo (con stanghetta)</option>
                <option value="icons-only-divider">Solo icone, senza sfondo (con stanghetta)</option>
              </select>
            </label>
            {(data.ctas || []).length < 4 && (
              <button type="button" onClick={addCta} className="text-xs text-warm-700 hover:text-warm-900 underline flex items-center gap-1"><Plus size={12} /> Aggiungi pulsante</button>
            )}
          </div>
        </div>
        {(data.ctaGroupStyle === "icons-only-divider" || data.ctaGroupStyle === "icons-text-divider") && (
          <p className="text-[10px] text-warm-500 -mt-2">
            {data.ctaGroupStyle === "icons-only-divider"
              ? "Stile «Solo icone»: tutti i pulsanti devono essere «Personalizzato» con icona SVG/PNG caricata. Niente sfondo né testo, separati da una stanghetta verticale."
              : "Stile «Icona + testo»: i pulsanti devono essere «Personalizzato» con icona SVG/PNG + label. Mostrati come icona + testo accanto, senza sfondo, separati da una stanghetta verticale."}
          </p>
        )}
        {(data.ctas || []).map((c, i) => (
          <div key={i} className="border border-warm-200 bg-white rounded p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center">
              <input type="text" value={c.label} onChange={(e) => updCta(i, { label: e.target.value })} placeholder="Etichetta pulsante" className="col-span-4 border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
              <input type="text" value={c.href} onChange={(e) => updCta(i, { href: e.target.value })} placeholder="https://… oppure /percorso" className="col-span-5 border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
              <select value={c.style || "default"} onChange={(e) => updCta(i, { style: e.target.value as CtaButtonStyle })} className="col-span-2 border border-warm-300 rounded px-2 py-1.5 text-xs focus:border-warm-800 focus:outline-none">
                {CTA_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={() => delCta(i)} className="col-span-1 p-1.5 text-warm-400 hover:text-red-600" title="Rimuovi pulsante"><X size={14} /></button>
            </div>
            {c.style === "custom" && (
              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wider mb-1">Icona SVG/PNG *</label>
                <ImageUploadField label="" value={c.iconUrl || ""} onChange={(url) => updCta(i, { iconUrl: url })} onRemove={() => updCta(i, { iconUrl: "" })} purpose="general" folder="news" helpText="SVG quadrato 24x24px o 32x32px, viewBox riempito senza padding. PNG: minimo 64x64px sfondo trasparente." />
              </div>
            )}
          </div>
        ))}
        {(data.ctas || []).length === 0 && <div className="text-xs text-warm-400">Nessun pulsante. Clicca &laquo;Aggiungi pulsante&raquo;.</div>}
      </div>
    </div>
  );
}

/* ── SINGLE CTA — block standalone con titolo + descrizione + 1+ pulsanti ── */
export function SingleCtaEditor({ data, onChange, sourceData }: { data: NewsSingleCtaData; onChange: (d: NewsSingleCtaData) => void; sourceData?: Partial<NewsSingleCtaData> }) {
  void sourceData;
  const setCtas = (next: NewsCta[]) => onChange({ ...data, ctas: next });
  const addCta = () => setCtas([...(data.ctas || []), { label: "", href: "", style: "default" }]);
  const updCta = (i: number, patch: Partial<NewsCta>) => setCtas((data.ctas || []).map((c, j) => j === i ? { ...c, ...patch } : c));
  const delCta = (i: number) => setCtas((data.ctas || []).filter((_, j) => j !== i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
          <input type="text" value={data.title || ""} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="es. Scopri di più" className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Allineamento</label>
          <select value={data.align || "center"} onChange={(e) => onChange({ ...data, align: e.target.value as "left" | "center" | "right" })} className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none bg-white">
            <option value="left">Sinistra</option>
            <option value="center">Centro</option>
            <option value="right">Destra</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Descrizione (opzionale)</label>
        <textarea value={data.body || ""} onChange={(e) => onChange({ ...data, body: e.target.value })} rows={2} placeholder="Breve testo sopra il pulsante." className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
      </div>

      <div className="border border-warm-200 bg-warm-50/30 rounded p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider">Pulsanti</div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-warm-600 inline-flex items-center gap-1.5">
              Stile:
              <select value={data.ctaGroupStyle || "boxed"} onChange={(e) => onChange({ ...data, ctaGroupStyle: e.target.value as "boxed" | "icons-divider" })} className="border border-warm-300 rounded px-2 py-1 text-xs focus:border-warm-800 focus:outline-none bg-white">
                <option value="boxed">Pulsanti con sfondo</option>
                <option value="icons-divider">Icone affiancate (separate da stanghetta)</option>
              </select>
            </label>
            {(data.ctas || []).length < 4 && (
              <button type="button" onClick={addCta} className="text-xs text-warm-700 hover:text-warm-900 underline flex items-center gap-1"><Plus size={12} /> Aggiungi</button>
            )}
          </div>
        </div>
        {(data.ctas || []).map((c, i) => (
          <div key={i} className="border border-warm-200 bg-white rounded p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 items-center">
              <input type="text" value={c.label} onChange={(e) => updCta(i, { label: e.target.value })} placeholder="Etichetta" className="col-span-4 border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
              <input type="text" value={c.href} onChange={(e) => updCta(i, { href: e.target.value })} placeholder="https://… o /percorso" className="col-span-5 border border-warm-300 rounded px-3 py-1.5 text-sm focus:border-warm-800 focus:outline-none" />
              <select value={c.style || "default"} onChange={(e) => updCta(i, { style: e.target.value as CtaButtonStyle })} className="col-span-2 border border-warm-300 rounded px-2 py-1.5 text-xs focus:border-warm-800 focus:outline-none">
                {CTA_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={() => delCta(i)} className="col-span-1 p-1.5 text-warm-400 hover:text-red-600" title="Rimuovi"><X size={14} /></button>
            </div>
            {c.style === "custom" && (
              <ImageUploadField label="Icona SVG/PNG" value={c.iconUrl || ""} onChange={(url) => updCta(i, { iconUrl: url })} onRemove={() => updCta(i, { iconUrl: "" })} purpose="general" folder="news" helpText="SVG quadrato 24x24px o 32x32px, viewBox riempito senza padding. PNG: minimo 64x64px sfondo trasparente." />
            )}
          </div>
        ))}
        {(data.ctas || []).length === 0 && <div className="text-xs text-warm-400">Nessun pulsante. Clicca &laquo;Aggiungi&raquo;.</div>}
      </div>
    </div>
  );
}

/* ── CARDS ROW (Come funziona) ─────────────────────────────────────────── */
export function CardsRowEditor({ data, onChange, sourceData }: { data: NewsCardsRowData; onChange: (d: NewsCardsRowData) => void; sourceData?: Partial<NewsCardsRowData> }) {
  void sourceData;
  const items = data.items || [];
  const setItems = (next: NewsCardItem[]) => onChange({ ...data, items: next });
  const upd = (i: number, patch: Partial<NewsCardItem>) => setItems(items.map((it, j) => j === i ? { ...it, ...patch } : it));
  const addItem = () => setItems([...items, { title: "", description: "" }]);
  const delItem = (i: number) => setItems(items.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo sezione</label>
          <input type="text" value={data.sectionTitle || ""} onChange={(e) => onChange({ ...data, sectionTitle: e.target.value })} placeholder="COME FUNZIONA" className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Colonne</label>
          <select value={data.columns || 3} onChange={(e) => onChange({ ...data, columns: Number(e.target.value) as 2 | 3 | 4 })} className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none">
            <option value={2}>2 colonne</option>
            <option value={3}>3 colonne</option>
            <option value={4}>4 colonne</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={data.autoNumber !== false} onChange={(e) => onChange({ ...data, autoNumber: e.target.checked })} className="w-4 h-4 accent-warm-800" />
        <span className="text-sm text-warm-700">Numerazione automatica (01., 02., 03.…)</span>
      </label>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border border-warm-200 bg-warm-50/30 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-warm-500 w-6">#{i + 1}</span>
              {data.autoNumber === false && (
                <input type="text" value={it.number || ""} onChange={(e) => upd(i, { number: e.target.value })} placeholder="01." className="w-20 border border-warm-300 rounded px-2 py-1.5 text-sm bg-white focus:border-warm-800 focus:outline-none" />
              )}
              <input type="text" value={it.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Titolo card" className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm font-medium bg-white focus:border-warm-800 focus:outline-none" />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-warm-400 hover:text-warm-700 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 text-warm-400 hover:text-warm-700 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => delItem(i)} className="p-1.5 text-warm-400 hover:text-red-600"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 items-start">
              <ImageUploadField label="Icona (SVG/PNG)" value={it.iconUrl || ""} onChange={(url) => upd(i, { iconUrl: url })} onRemove={() => upd(i, { iconUrl: "" })} purpose="general" folder="news" helpText="SVG quadrato consigliato" />
              <textarea value={it.description || ""} onChange={(e) => upd(i, { description: e.target.value })} placeholder="Descrizione card…" rows={3} className="col-span-2 border border-warm-300 rounded px-3 py-2 text-sm bg-white focus:border-warm-800 focus:outline-none" />
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} className="w-full py-2 border border-dashed border-warm-300 rounded text-sm text-warm-600 hover:bg-warm-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Aggiungi card</button>
      </div>
    </div>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────────────── */
export function FaqEditor({ data, onChange, sourceData }: { data: NewsFaqData; onChange: (d: NewsFaqData) => void; sourceData?: Partial<NewsFaqData> }) {
  void sourceData;
  const items = data.items || [];
  const upd = (i: number, patch: Partial<{ question: string; answer: string }>) => onChange({ ...data, items: items.map((it, j) => j === i ? { ...it, ...patch } : it) });
  const add = () => onChange({ ...data, items: [...items, { question: "", answer: "" }] });
  const del = (i: number) => onChange({ ...data, items: items.filter((_, j) => j !== i) });
  return (
    <div className="space-y-3">
      <input type="text" value={data.sectionTitle || ""} onChange={(e) => onChange({ ...data, sectionTitle: e.target.value })} placeholder="Titolo sezione (opzionale, es. DOMANDE FREQUENTI)" className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
      {items.map((it, i) => (
        <div key={i} className="border border-warm-200 bg-warm-50/30 rounded p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-mono text-warm-500 pt-2 w-6">Q{i + 1}</span>
            <input type="text" value={it.question} onChange={(e) => upd(i, { question: e.target.value })} placeholder="Domanda…" className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm font-medium bg-white focus:border-warm-800 focus:outline-none" />
            <button type="button" onClick={() => del(i)} className="p-1.5 text-warm-400 hover:text-red-600"><X size={14} /></button>
          </div>
          <textarea value={it.answer} onChange={(e) => upd(i, { answer: e.target.value })} rows={3} placeholder="Risposta…" className="w-full border border-warm-300 rounded px-3 py-2 text-sm bg-white focus:border-warm-800 focus:outline-none" />
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-2 border border-dashed border-warm-300 rounded text-sm text-warm-600 hover:bg-warm-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Aggiungi domanda</button>
    </div>
  );
}

/* ── STATS ─────────────────────────────────────────────────────────────── */
export function StatsEditor({ data, onChange, sourceData }: { data: NewsStatsData; onChange: (d: NewsStatsData) => void; sourceData?: Partial<NewsStatsData> }) {
  void sourceData;
  const items = data.items || [];
  const upd = (i: number, patch: Partial<{ value: string; label: string }>) => onChange({ ...data, items: items.map((it, j) => j === i ? { ...it, ...patch } : it) });
  const add = () => onChange({ ...data, items: [...items, { value: "", label: "" }] });
  const del = (i: number) => onChange({ ...data, items: items.filter((_, j) => j !== i) });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={data.sectionTitle || ""} onChange={(e) => onChange({ ...data, sectionTitle: e.target.value })} placeholder="Titolo sezione (opzionale)" className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        <select value={data.columns || 3} onChange={(e) => onChange({ ...data, columns: Number(e.target.value) as 2 | 3 | 4 })} className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none">
          <option value={2}>2 colonne</option>
          <option value={3}>3 colonne</option>
          <option value={4}>4 colonne</option>
        </select>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input type="text" value={it.value} onChange={(e) => upd(i, { value: e.target.value })} placeholder="es. +500 / 10K" className="col-span-3 border border-warm-300 rounded px-3 py-2 text-base font-semibold focus:border-warm-800 focus:outline-none" />
          <input type="text" value={it.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Descrizione del dato" className="col-span-8 border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
          <button type="button" onClick={() => del(i)} className="col-span-1 p-1.5 text-warm-400 hover:text-red-600"><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-2 border border-dashed border-warm-300 rounded text-sm text-warm-600 hover:bg-warm-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Aggiungi statistica</button>
    </div>
  );
}

/* ── QUOTE ─────────────────────────────────────────────────────────────── */
export function QuoteEditor({ data, onChange, sourceData }: { data: NewsQuoteData; onChange: (d: NewsQuoteData) => void; sourceData?: Partial<NewsQuoteData> }) {
  void sourceData;
  return (
    <div className="space-y-3">
      <textarea value={data.text} onChange={(e) => onChange({ ...data, text: e.target.value })} rows={4} placeholder="Testo della citazione" className="w-full border border-warm-300 rounded px-4 py-3 text-base italic focus:border-warm-800 focus:outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={data.author || ""} onChange={(e) => onChange({ ...data, author: e.target.value })} placeholder="Autore (opzionale)" className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        <input type="text" value={data.authorRole || ""} onChange={(e) => onChange({ ...data, authorRole: e.target.value })} placeholder="Ruolo / azienda (opzionale)" className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Allineamento</label>
        <div className="flex gap-2">
          {(["left", "center"] as const).map((a) => (
            <button key={a} type="button" onClick={() => onChange({ ...data, align: a })}
              className={`px-4 py-1.5 rounded text-sm border ${data.align === a ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300"}`}>
              {a === "left" ? "Sinistra" : "Centro"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── TIMELINE ──────────────────────────────────────────────────────────── */
export function TimelineEditor({ data, onChange, sourceData }: { data: NewsTimelineData; onChange: (d: NewsTimelineData) => void; sourceData?: Partial<NewsTimelineData> }) {
  void sourceData;
  const items = data.items || [];
  const upd = (i: number, patch: Partial<{ date: string; title: string; description: string }>) => onChange({ ...data, items: items.map((it, j) => j === i ? { ...it, ...patch } : it) });
  const add = () => onChange({ ...data, items: [...items, { date: "", title: "", description: "" }] });
  const del = (i: number) => onChange({ ...data, items: items.filter((_, j) => j !== i) });
  return (
    <div className="space-y-3">
      <input type="text" value={data.sectionTitle || ""} onChange={(e) => onChange({ ...data, sectionTitle: e.target.value })} placeholder="Titolo sezione (opzionale)" className="w-full border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
      {items.map((it, i) => (
        <div key={i} className="border border-warm-200 bg-warm-50/30 rounded p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input type="text" value={it.date} onChange={(e) => upd(i, { date: e.target.value })} placeholder="es. 1849 / Marzo 2024" className="w-44 border border-warm-300 rounded px-3 py-1.5 text-sm font-semibold bg-white focus:border-warm-800 focus:outline-none" />
            <input type="text" value={it.title} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Titolo evento" className="flex-1 border border-warm-300 rounded px-3 py-1.5 text-sm bg-white focus:border-warm-800 focus:outline-none" />
            <button type="button" onClick={() => del(i)} className="p-1.5 text-warm-400 hover:text-red-600"><X size={14} /></button>
          </div>
          <textarea value={it.description || ""} onChange={(e) => upd(i, { description: e.target.value })} rows={2} placeholder="Descrizione (opzionale)" className="w-full border border-warm-300 rounded px-3 py-2 text-sm bg-white focus:border-warm-800 focus:outline-none" />
        </div>
      ))}
      <button type="button" onClick={add} className="w-full py-2 border border-dashed border-warm-300 rounded text-sm text-warm-600 hover:bg-warm-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Aggiungi evento</button>
    </div>
  );
}

/* ── COMPARISON TABLE ──────────────────────────────────────────────────── */
export function ComparisonTableEditor({ data, onChange, sourceData }: { data: NewsComparisonTableData; onChange: (d: NewsComparisonTableData) => void; sourceData?: Partial<NewsComparisonTableData> }) {
  void sourceData;
  const cols = data.columnHeaders || [];
  const rows = data.rows || [];
  const setCols = (next: string[]) => {
    // Allinea le righe alla nuova larghezza
    const newRows = rows.map((r) => {
      const vs = [...r.values];
      while (vs.length < next.length) vs.push("");
      vs.length = next.length;
      return { ...r, values: vs };
    });
    onChange({ ...data, columnHeaders: next, rows: newRows });
  };
  const addCol = () => setCols([...cols, `Col ${cols.length + 1}`]);
  const delCol = (i: number) => setCols(cols.filter((_, j) => j !== i));
  const updCol = (i: number, v: string) => setCols(cols.map((c, j) => j === i ? v : c));

  const updRow = (i: number, patch: Partial<{ label: string; values: string[] }>) => onChange({ ...data, rows: rows.map((r, j) => j === i ? { ...r, ...patch } : r) });
  const addRow = () => onChange({ ...data, rows: [...rows, { label: "", values: cols.map(() => "") }] });
  const delRow = (i: number) => onChange({ ...data, rows: rows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={data.sectionTitle || ""} onChange={(e) => onChange({ ...data, sectionTitle: e.target.value })} placeholder="Titolo sezione (opzionale)" className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none" />
        <select value={data.highlightColumn ?? -1} onChange={(e) => onChange({ ...data, highlightColumn: Number(e.target.value) >= 0 ? Number(e.target.value) : undefined })} className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none">
          <option value={-1}>Nessuna colonna evidenziata</option>
          {cols.map((c, i) => <option key={i} value={i}>Evidenzia: {c || `Col ${i + 1}`}</option>)}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Colonne</div>
        <div className="flex flex-wrap gap-2">
          {cols.map((c, i) => (
            <div key={i} className="flex items-center gap-1 border border-warm-300 rounded px-2 py-1 bg-warm-50">
              <input type="text" value={c} onChange={(e) => updCol(i, e.target.value)} className="w-28 border-0 bg-transparent text-sm focus:outline-none" />
              <button type="button" onClick={() => delCol(i)} className="text-warm-400 hover:text-red-600"><X size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={addCol} className="text-xs px-2 py-1 border border-dashed border-warm-300 rounded text-warm-600 hover:bg-warm-50 flex items-center gap-1"><Plus size={12} /> Colonna</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-warm-200 rounded">
          <thead className="bg-warm-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-warm-600 uppercase">Riga</th>
              {cols.map((c, i) => <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-warm-600 uppercase">{c}</th>)}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {rows.map((r, ri) => (
              <tr key={ri}>
                <td className="px-2 py-1.5">
                  <input type="text" value={r.label} onChange={(e) => updRow(ri, { label: e.target.value })} placeholder="Caratteristica" className="w-full border border-warm-300 rounded px-2 py-1 text-sm focus:border-warm-800 focus:outline-none" />
                </td>
                {cols.map((_, ci) => (
                  <td key={ci} className="px-2 py-1.5">
                    <input type="text" value={r.values[ci] || ""} onChange={(e) => updRow(ri, { values: r.values.map((v, j) => j === ci ? e.target.value : v) })} placeholder="✓ / – / valore" className="w-full border border-warm-300 rounded px-2 py-1 text-sm focus:border-warm-800 focus:outline-none" />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => delRow(ri)} className="p-1 text-warm-400 hover:text-red-600"><X size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow} className="w-full py-2 border border-dashed border-warm-300 rounded text-sm text-warm-600 hover:bg-warm-50 flex items-center justify-center gap-1.5"><Plus size={14} /> Aggiungi riga</button>
    </div>
  );
}
