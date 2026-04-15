"use client";

import type { CampaignParagraphData } from "@/types";
import RichTextField from "../RichTextField";

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
        <RichTextField
          value={data.title || ""}
          onChange={(html) => onChange({ ...data, title: html })}
          placeholder="es. CAMPARINO IN GALLERIA"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Testo
        </label>
        <RichTextField
          value={data.body || ""}
          onChange={(html) => onChange({ ...data, body: html })}
          placeholder="Paragrafo centrato"
          multiline
          minHeight={140}
        />
      </div>
    </div>
  );
}
