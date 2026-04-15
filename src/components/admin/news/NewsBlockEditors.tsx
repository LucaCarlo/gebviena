"use client";

import ImageUploadField from "../ImageUploadField";
import RichTextField from "../RichTextField";
import type {
  NewsParagraphData,
  NewsImageTextBgData,
  NewsThreeImagesData,
  NewsSingleImageData,
} from "@/types";

export function ParagraphEditor({ data, onChange }: { data: NewsParagraphData; onChange: (d: NewsParagraphData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <RichTextField value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} placeholder="Titolo paragrafo" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo</label>
        <RichTextField value={data.body || ""} onChange={(html) => onChange({ ...data, body: html })} multiline minHeight={140} />
      </div>
    </div>
  );
}

export function ImageTextBgEditor({ data, onChange }: { data: NewsImageTextBgData; onChange: (d: NewsImageTextBgData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Posizione immagine</label>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => onChange({ ...data, imagePosition: pos })}
              className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                data.imagePosition === pos ? "bg-warm-800 text-white border-warm-800" : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
              }`}
            >
              {pos === "left" ? "Immagine a sinistra" : "Immagine a destra"}
            </button>
          ))}
        </div>
      </div>
      <ImageUploadField label="Immagine" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <RichTextField value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} placeholder="Titolo sezione" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Testo</label>
        <RichTextField value={data.text || ""} onChange={(html) => onChange({ ...data, text: html })} multiline minHeight={140} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — etichetta (opzionale)</label>
          <input type="text" value={data.ctaLabel || ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} placeholder="Scopri di più" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — link</label>
          <input type="text" value={data.ctaHref || ""} onChange={(e) => onChange({ ...data, ctaHref: e.target.value })} placeholder="/mondo-gtv/heritage" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        </div>
      </div>
    </div>
  );
}

export function ThreeImagesEditor({ data, onChange }: { data: NewsThreeImagesData; onChange: (d: NewsThreeImagesData) => void }) {
  const imgs = data.images || [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }];
  const update = (i: number, patch: Partial<{ url: string; caption: string }>) => {
    const next = imgs.map((im, idx) => (idx === i ? { ...im, ...patch } : im));
    onChange({ images: next });
  };
  return (
    <div className="space-y-4">
      {imgs.slice(0, 3).map((im, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 border-b border-warm-100 last:border-b-0">
          <ImageUploadField label={`Immagine ${i + 1}`} value={im.url} onChange={(url) => update(i, { url })} onRemove={() => update(i, { url: "" })} purpose="general" folder="news" aspectRatio={2 / 3} />
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Didascalia</label>
            <input type="text" value={im.caption} onChange={(e) => update(i, { caption: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SingleImageEditor({ data, onChange }: { data: NewsSingleImageData; onChange: (d: NewsSingleImageData) => void }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Didascalia (opzionale)</label>
        <input type="text" value={data.caption || ""} onChange={(e) => onChange({ ...data, caption: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
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
