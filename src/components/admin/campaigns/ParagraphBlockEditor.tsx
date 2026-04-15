"use client";

import type { CampaignParagraphData } from "@/types";

interface Props {
  data: CampaignParagraphData;
  onChange: (data: CampaignParagraphData) => void;
}

export default function ParagraphBlockEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (opzionale)
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          placeholder="es. CAMPARINO IN GALLERIA"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Testo
        </label>
        <textarea
          value={data.body}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          rows={6}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          placeholder="Paragrafo centrato"
        />
      </div>
    </div>
  );
}
