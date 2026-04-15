"use client";

import ImageUploadField from "../ImageUploadField";
import type { CampaignThreeImagesData } from "@/types";

interface Props {
  data: CampaignThreeImagesData;
  onChange: (data: CampaignThreeImagesData) => void;
}

export default function ThreeImagesBlockEditor({ data, onChange }: Props) {
  const items = [0, 1, 2].map((i) => data.images[i] || { url: "", caption: "" });

  const update = (i: number, patch: Partial<{ url: string; caption: string }>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange({ images: next });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((img, i) => (
        <div key={i} className="space-y-3 p-3 rounded-lg border border-warm-200 bg-warm-50/30">
          <p className="text-xs font-semibold text-warm-600 uppercase">Immagine {i + 1}</p>
          <ImageUploadField
            label=""
            value={img.url}
            onChange={(url) => update(i, { url })}
            onRemove={() => update(i, { url: "" })}
            purpose="general"
            folder="campaigns"
            aspectRatio={2 / 3}
          />
          <div>
            <label className="block text-[11px] font-semibold text-warm-600 uppercase tracking-wider mb-1">
              Caption / Alt text
            </label>
            <input
              type="text"
              value={img.caption}
              onChange={(e) => update(i, { caption: e.target.value })}
              className="w-full border border-warm-300 rounded px-3 py-1.5 text-xs focus:border-warm-800 focus:outline-none"
              placeholder="es. Czech by Hermann Czech"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
