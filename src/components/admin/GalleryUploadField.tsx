"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, GripVertical, ImageIcon } from "lucide-react";
import MediaPickerModal from "./MediaPickerModal";

interface GalleryUploadFieldProps {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  helpText?: string;
}

export default function GalleryUploadField({
  label,
  value,
  onChange,
  folder = "products",
  helpText,
}: GalleryUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skipCompression, setSkipCompression] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "gallery");
      formData.append("folder", folder);
      if (skipCompression) formData.append("skipCompression", "true");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) newUrls.push(data.data.url);
      } catch { /* skip failed uploads */ }
    }

    onChange([...value, ...newUrls]);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleUpload(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUpload(files);
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newUrls = [...value];
    const [moved] = newUrls.splice(dragIndex, 1);
    newUrls.splice(index, 0, moved);
    onChange(newUrls);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleMediaSelect = (urls: string[]) => {
    if (urls.length > 0) {
      onChange([...value, ...urls]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {helpText && <p className="text-[10px] text-warm-400 mb-2">{helpText}</p>}

      {/* Gallery grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-3">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden border border-warm-200 bg-warm-50 cursor-move ${
                dragIndex === i ? "opacity-50 ring-2 ring-warm-400" : ""
              }`}
            >
              <div className="relative aspect-square">
                <Image src={url} alt={`Immagine ${i + 1}`} fill className="object-cover" sizes="150px" />
              </div>
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} className="text-white drop-shadow" />
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={10} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] text-center py-0.5">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone + Media picker */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex-1 flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              dragOver ? "border-warm-500 bg-warm-50" : "border-warm-300 hover:border-warm-400"
            }`}
          >
            {uploading ? (
              <Loader2 size={18} className="text-warm-400 animate-spin" />
            ) : (
              <>
                <Upload size={18} className="text-warm-400 mb-1" />
                <span className="text-[10px] text-warm-500">
                  {skipCompression ? "Originale • Nessuna compressione" : "Carica immagini"}
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center h-20 w-24 border border-warm-300 rounded-lg text-warm-600 hover:bg-warm-50 hover:border-warm-400 transition-colors"
          >
            <ImageIcon size={18} className="mb-1" />
            <span className="text-[10px]">Da Media</span>
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={skipCompression}
            onChange={(e) => setSkipCompression(e.target.checked)}
            className="rounded border-warm-300"
          />
          <span className="text-[11px] text-warm-500">Non comprimere (immagini gia ottimizzate)</span>
        </label>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleMediaSelect}
        multiple
      />
    </div>
  );
}
