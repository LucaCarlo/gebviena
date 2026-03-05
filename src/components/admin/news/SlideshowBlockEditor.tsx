"use client";

import GalleryUploadField from "@/components/admin/GalleryUploadField";
import { SlideshowBlockData } from "@/types";

interface SlideshowBlockEditorProps {
  data: SlideshowBlockData;
  onChange: (data: SlideshowBlockData) => void;
}

export default function SlideshowBlockEditor({ data, onChange }: SlideshowBlockEditorProps) {
  return (
    <div>
      <GalleryUploadField
        label="Immagini slideshow"
        value={data.images}
        onChange={(urls) => onChange({ ...data, images: urls })}
        folder="news"
      />
    </div>
  );
}
