"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import { ImageBlockData } from "@/types";

interface ImageBlockEditorProps {
  data: ImageBlockData;
  onChange: (data: ImageBlockData) => void;
}

const LAYOUT_OPTIONS: { value: ImageBlockData["layout"]; label: string }[] = [
  { value: "full", label: "Intera larghezza" },
  { value: "contained", label: "Contenuta" },
  { value: "side-by-side", label: "Affiancate" },
];

export default function ImageBlockEditor({ data, onChange }: ImageBlockEditorProps) {
  const updateImage = (index: number, url: string) => {
    const images = [...data.images];
    images[index] = url;
    onChange({ ...data, images });
  };

  const removeImage = (index: number) => {
    const images = [...data.images];
    images[index] = "";
    onChange({ ...data, images: images.filter((img) => img !== "") });
  };

  return (
    <div className="space-y-4">
      {/* Layout selector */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Layout
        </label>
        <div className="flex gap-2">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, layout: opt.value })}
              className={`px-4 py-2 text-xs rounded border transition-colors ${
                data.layout === opt.value
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* First image */}
      <ImageUploadField
        label="Immagine"
        value={data.images[0] || ""}
        onChange={(url) => updateImage(0, url)}
        onRemove={() => removeImage(0)}
        folder="news"
        purpose="news"
      />

      {/* Second image (only for side-by-side) */}
      {data.layout === "side-by-side" && (
        <ImageUploadField
          label="Seconda immagine"
          value={data.images[1] || ""}
          onChange={(url) => updateImage(1, url)}
          onRemove={() => removeImage(1)}
          folder="news"
          purpose="news"
        />
      )}

      {/* Caption */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Didascalia (opzionale)
        </label>
        <input
          type="text"
          value={data.caption || ""}
          onChange={(e) => onChange({ ...data, caption: e.target.value || undefined })}
          placeholder="Didascalia dell'immagine..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>
    </div>
  );
}
