"use client";

import { SeparatorBlockData } from "@/types";

interface SeparatorBlockEditorProps {
  data: SeparatorBlockData;
  onChange: (data: SeparatorBlockData) => void;
}

const HEIGHT_OPTIONS: { value: SeparatorBlockData["height"]; label: string }[] = [
  { value: "small", label: "Piccolo" },
  { value: "medium", label: "Medio" },
  { value: "large", label: "Grande" },
];

export default function SeparatorBlockEditor({ data, onChange }: SeparatorBlockEditorProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
        Altezza
      </label>
      <div className="flex gap-2">
        {HEIGHT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...data, height: opt.value })}
            className={`px-4 py-2 text-xs rounded border transition-colors ${
              data.height === opt.value
                ? "bg-warm-800 text-white border-warm-800"
                : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
