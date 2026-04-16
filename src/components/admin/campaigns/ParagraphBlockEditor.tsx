"use client";

import type { CampaignParagraphData } from "@/types";
import { BlockRichText } from "../news/BlockAIField";

interface Props {
  data: CampaignParagraphData;
  onChange: (data: CampaignParagraphData) => void;
  sourceData?: Partial<CampaignParagraphData>;
}

export default function ParagraphBlockEditor({ data, onChange, sourceData }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (opzionale)
        </label>
        <BlockRichText
          value={data.title || ""}
          onChange={(html) => onChange({ ...data, title: html })}
          sourceText={sourceData?.title || ""}
          placeholder="es. CAMPARINO IN GALLERIA"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Testo
        </label>
        <BlockRichText
          value={data.body || ""}
          onChange={(html) => onChange({ ...data, body: html })}
          sourceText={sourceData?.body || ""}
          placeholder="Paragrafo centrato"
          multiline
          minHeight={140}
        />
      </div>
    </div>
  );
}
