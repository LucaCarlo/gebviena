"use client";

import { useState, useEffect } from "react";
import ImageUploadField from "../ImageUploadField";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

function isYouTube(url: string) {
  return /youtu\.?be/.test(url);
}

export default function VideoField({ value, onChange }: Props) {
  const [mode, setMode] = useState<"upload" | "youtube">(() =>
    value && isYouTube(value) ? "youtube" : "upload"
  );

  useEffect(() => {
    if (value && isYouTube(value) && mode !== "youtube") setMode("youtube");
  }, [value, mode]);

  const switchMode = (m: "upload" | "youtube") => {
    if (m !== mode) {
      setMode(m);
      onChange("");
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
        Video
      </label>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={`px-4 py-1.5 rounded text-sm border transition-colors ${
            mode === "upload"
              ? "bg-warm-800 text-white border-warm-800"
              : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
          }`}
        >
          Carica file
        </button>
        <button
          type="button"
          onClick={() => switchMode("youtube")}
          className={`px-4 py-1.5 rounded text-sm border transition-colors ${
            mode === "youtube"
              ? "bg-warm-800 text-white border-warm-800"
              : "bg-white text-warm-600 border-warm-300 hover:bg-warm-50"
          }`}
        >
          Link YouTube
        </button>
      </div>

      {mode === "upload" ? (
        <ImageUploadField
          label=""
          value={value && !isYouTube(value) ? value : ""}
          onChange={onChange}
          onRemove={() => onChange("")}
          purpose="general"
          folder="campaigns"
          acceptVideo
          helpText="Carica un file video (MP4, WebM). Apparira in cima alla pagina."
        />
      ) : (
        <div>
          <input
            type="url"
            value={value && isYouTube(value) ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
          />
          <p className="text-[11px] text-warm-400 mt-1">
            Incolla il link completo del video YouTube. Sara mostrato embeddato in cima alla pagina.
          </p>
        </div>
      )}
    </div>
  );
}
