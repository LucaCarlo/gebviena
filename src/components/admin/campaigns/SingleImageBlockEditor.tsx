"use client";

import ImageUploadField from "../ImageUploadField";
import type { CampaignSingleImageData } from "@/types";

interface Props {
  data: CampaignSingleImageData;
  onChange: (data: CampaignSingleImageData) => void;
}

export default function SingleImageBlockEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Immagine"
        value={data.imageUrl}
        onChange={(url) => onChange({ ...data, imageUrl: url })}
        onRemove={() => onChange({ ...data, imageUrl: "" })}
        purpose="general"
        folder="campaigns"
      />
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          …oppure URL video (YouTube, Vimeo o file mp4)
        </label>
        <input
          type="text"
          value={data.videoUrl || ""}
          onChange={(e) => onChange({ ...data, videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... oppure /uploads/video.mp4"
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
        <p className="text-[10px] text-warm-400 mt-1">Se compilato, al posto dell&apos;immagine viene mostrato il video.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Didascalia (opzionale)
        </label>
        <input
          type="text"
          value={data.caption || ""}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>
    </div>
  );
}
