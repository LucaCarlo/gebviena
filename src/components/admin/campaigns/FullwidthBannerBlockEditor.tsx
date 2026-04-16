"use client";

import { useState } from "react";
import ImageUploadField from "../ImageUploadField";
import { BlockTextInput } from "../news/BlockAIField";
import type { CampaignFullwidthBannerData } from "@/types";

interface Props {
  data: CampaignFullwidthBannerData;
  onChange: (data: CampaignFullwidthBannerData) => void;
  sourceData?: Partial<CampaignFullwidthBannerData>;
}

export default function FullwidthBannerBlockEditor({ data, onChange, sourceData }: Props) {
  const [uploading, setUploading] = useState(false);
  const uploadPdf = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "documents");
      fd.append("skipCompression", "true");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const payload = await res.json();
      const url = payload?.data?.url || payload?.url;
      if (payload.success && url) onChange({ ...data, ctaHref: url });
      else alert(payload?.error || "Upload PDF fallito");
    } finally {
      setUploading(false);
    }
  };
  const isPdf = /\.pdf($|\?)/i.test(data.ctaHref || "");
  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Immagine (full-width, scura)"
        value={data.imageUrl}
        onChange={(url) => onChange({ ...data, imageUrl: url })}
        onRemove={() => onChange({ ...data, imageUrl: "" })}
        purpose="hero"
        folder="campaigns"
        aspectRatio={1600 / 900}
      />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (sovraimpresso, allineato a sinistra)
        </label>
        <BlockTextInput
          value={data.title || ""}
          onChange={(v) => onChange({ ...data, title: v })}
          sourceText={sourceData?.title || ""}
          placeholder="Scrivi il titolo"
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            CTA — etichetta (opzionale)
          </label>
          <BlockTextInput
            value={data.ctaLabel || ""}
            onChange={(v) => onChange({ ...data, ctaLabel: v })}
            sourceText={sourceData?.ctaLabel || ""}
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            CTA — link o PDF
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.ctaHref || ""}
              onChange={(e) => onChange({ ...data, ctaHref: e.target.value })}
              placeholder="/percorso oppure carica un PDF"
              className="flex-1 border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
            />
            <label className="px-3 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-xs font-medium rounded cursor-pointer whitespace-nowrap flex items-center">
              {uploading ? "..." : "PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPdf(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {isPdf && <p className="text-[10px] text-warm-500 mt-1">Verra scaricato (attributo download).</p>}
        </div>
      </div>
    </div>
  );
}
