"use client";

import ImageUploadField from "../ImageUploadField";
import type { CampaignImageTextData } from "@/types";

interface Props {
  data: CampaignImageTextData;
  onChange: (data: CampaignImageTextData) => void;
}

export default function ImageTextBlockEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Posizione immagine
        </label>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => onChange({ ...data, imagePosition: pos })}
              className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                data.imagePosition === pos
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
              }`}
            >
              {pos === "left" ? "Immagine a sinistra" : "Immagine a destra"}
            </button>
          ))}
        </div>
      </div>

      <ImageUploadField
        label="Immagine verticale"
        value={data.imageUrl}
        onChange={(url) => onChange({ ...data, imageUrl: url })}
        onRemove={() => onChange({ ...data, imageUrl: "" })}
        purpose="general"
        folder="campaigns"
        aspectRatio={3 / 4}
      />

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (opzionale)
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          placeholder="es. IL GESTO CREA SPAZIO..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Testo
        </label>
        <textarea
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          rows={6}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      <ImageUploadField
        label="Immagine sotto il testo (opzionale, orizzontale)"
        value={data.secondaryImageUrl || ""}
        onChange={(url) => onChange({ ...data, secondaryImageUrl: url })}
        onRemove={() => onChange({ ...data, secondaryImageUrl: "" })}
        purpose="general"
        folder="campaigns"
        aspectRatio={16 / 10}
      />
    </div>
  );
}
