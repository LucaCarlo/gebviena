"use client";

import { QuoteBlockData } from "@/types";

interface QuoteBlockEditorProps {
  data: QuoteBlockData;
  onChange: (data: QuoteBlockData) => void;
}

const STYLE_OPTIONS: { value: QuoteBlockData["style"]; label: string }[] = [
  { value: "default", label: "Standard" },
  { value: "handwritten", label: "Scritto a mano" },
];

export default function QuoteBlockEditor({ data, onChange }: QuoteBlockEditorProps) {
  return (
    <div className="space-y-4">
      {/* Quote text */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Citazione
        </label>
        <textarea
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
          placeholder="Inserisci la citazione..."
          rows={4}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 min-h-[120px] resize-y"
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Autore (opzionale)
        </label>
        <input
          type="text"
          value={data.author || ""}
          onChange={(e) => onChange({ ...data, author: e.target.value || undefined })}
          placeholder="Nome dell'autore..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      {/* Style selector */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Stile
        </label>
        <div className="flex gap-2">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, style: opt.value })}
              className={`px-4 py-2 text-xs rounded border transition-colors ${
                data.style === opt.value
                  ? "bg-warm-800 text-white border-warm-800"
                  : "bg-white text-warm-600 border-warm-300 hover:border-warm-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
