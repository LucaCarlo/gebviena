"use client";

import GalleryUploadField from "@/components/admin/GalleryUploadField";
import { GalleryBlockData } from "@/types";

interface GalleryBlockEditorProps {
  data: GalleryBlockData;
  onChange: (data: GalleryBlockData) => void;
}

const COLUMN_OPTIONS: { value: GalleryBlockData["columns"]; label: string }[] = [
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

export default function GalleryBlockEditor({ data, onChange }: GalleryBlockEditorProps) {
  return (
    <div className="space-y-4">
      {/* Columns selector */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Colonne
        </label>
        <div className="flex gap-2">
          {COLUMN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, columns: opt.value })}
              className={`px-4 py-2 text-xs rounded border transition-colors min-w-[48px] ${
                data.columns === opt.value
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery upload */}
      <GalleryUploadField
        label="Immagini"
        value={data.images}
        onChange={(urls) => onChange({ ...data, images: urls })}
        folder="news"
      />
    </div>
  );
}
