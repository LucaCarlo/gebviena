"use client";

import { useMemo } from "react";
import { VideoBlockData } from "@/types";

interface VideoBlockEditorProps {
  data: VideoBlockData;
  onChange: (data: VideoBlockData) => void;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

export default function VideoBlockEditor({ data, onChange }: VideoBlockEditorProps) {
  const embedUrl = useMemo(() => getEmbedUrl(data.url), [data.url]);

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          URL video
        </label>
        <input
          type="url"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      {/* Caption */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Didascalia (opzionale)
        </label>
        <input
          type="text"
          value={data.caption || ""}
          onChange={(e) => onChange({ ...data, caption: e.target.value || undefined })}
          placeholder="Didascalia del video..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      {/* Video preview */}
      {embedUrl && (
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
            Anteprima
          </label>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-warm-200 bg-warm-100">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Anteprima video"
            />
          </div>
        </div>
      )}
    </div>
  );
}
