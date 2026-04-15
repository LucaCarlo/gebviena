"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ImageUploadField from "../ImageUploadField";
import RichTextField from "../RichTextField";
import type {
  NewsParagraphData,
  NewsImageTextBgData,
  NewsThreeImagesData,
  NewsSingleImageData,
  NewsImageWithParagraphData,
  NewsFullwidthBannerData,
  NewsProductData,
} from "@/types";

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

export function ImageWithParagraphEditor({ data, onChange }: { data: NewsImageWithParagraphData; onChange: (d: NewsImageWithParagraphData) => void }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="general" folder="news" />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (opzionale)</label>
        <RichTextField value={data.title || ""} onChange={(html) => onChange({ ...data, title: html })} placeholder="Titolo" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Paragrafo (centrato sotto l&apos;immagine)</label>
        <RichTextField value={data.body || ""} onChange={(html) => onChange({ ...data, body: html })} multiline minHeight={140} />
      </div>
    </div>
  );
}

export function FullwidthBannerEditor({ data, onChange }: { data: NewsFullwidthBannerData; onChange: (d: NewsFullwidthBannerData) => void }) {
  return (
    <div className="space-y-4">
      <ImageUploadField label="Immagine (full-width, scura)" value={data.imageUrl} onChange={(url) => onChange({ ...data, imageUrl: url })} onRemove={() => onChange({ ...data, imageUrl: "" })} purpose="hero" folder="news" aspectRatio={1600 / 900} />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Titolo (sovraimpresso)</label>
        <input type="text" value={data.title || ""} onChange={(e) => onChange({ ...data, title: e.target.value })} placeholder="Sedute che invitano a restare, momenti che prendono forma" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        <p className="text-[10px] text-warm-400 mt-1">Usa &laquo;\\n&raquo; per andare a capo.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — etichetta (opzionale)</label>
          <input type="text" value={data.ctaLabel || ""} onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">CTA — link</label>
          <input type="text" value={data.ctaHref || ""} onChange={(e) => onChange({ ...data, ctaHref: e.target.value })} placeholder="/progetti" className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800" />
        </div>
      </div>
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

export function ShareInfo() {
  return <p className="text-sm text-warm-500">Mostra in pagina tre voci: <strong>Condividi su Facebook</strong>, <strong>Condividi su X</strong>, <strong>Copia link</strong>.</p>;
}

export function RelatedInfo() {
  return <p className="text-sm text-warm-500">Mostra la sezione fissa <strong>Continua a leggere</strong> con le altre 4 news piu recenti.</p>;
}
