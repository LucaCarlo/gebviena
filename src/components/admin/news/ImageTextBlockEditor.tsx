"use client";

import ImageUploadField from "@/components/admin/ImageUploadField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { ImageTextBlockData } from "@/types";

interface ImageTextBlockEditorProps {
  data: ImageTextBlockData;
  onChange: (data: ImageTextBlockData) => void;
}

const POSITION_OPTIONS: { value: ImageTextBlockData["imagePosition"]; label: string }[] = [
  { value: "left", label: "Immagine a sinistra" },
  { value: "right", label: "Immagine a destra" },
];

const LAYOUT_OPTIONS: { value: ImageTextBlockData["layout"]; label: string }[] = [
  { value: "50-50", label: "50 / 50" },
  { value: "40-60", label: "40 / 60" },
  { value: "60-40", label: "60 / 40" },
];

export default function ImageTextBlockEditor({ data, onChange }: ImageTextBlockEditorProps) {
  return (
    <div className="space-y-4">
      {/* Image position */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Posizione immagine
        </label>
        <div className="flex gap-2">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, imagePosition: opt.value })}
              className={`px-4 py-2 text-xs rounded border transition-colors ${
                data.imagePosition === opt.value
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layout ratio */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Proporzioni
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

      {/* Image upload */}
      <ImageUploadField
        label="Immagine"
        value={data.images[0] || ""}
        onChange={(url) => onChange({ ...data, images: [url] })}
        onRemove={() => onChange({ ...data, images: [] })}
        folder="news"
        purpose="news"
      />

      {/* Optional title */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (opzionale)
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          placeholder="Titolo della sezione..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      {/* Rich text */}
      <RichTextEditor
        label="Testo"
        value={data.text}
        onChange={(html) => onChange({ ...data, text: html })}
      />
    </div>
  );
}
