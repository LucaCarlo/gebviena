"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import MediaPickerModal from "./MediaPickerModal";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  purpose?: string;
  folder?: string;
  helpText?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  onRemove,
  purpose = "general",
  folder = "general",
  helpText,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skipCompression, setSkipCompression] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{ size?: number; originalSize?: number; width?: number; height?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadInfo(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    formData.append("folder", folder);
    if (skipCompression) formData.append("skipCompression", "true");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        onChange(data.data.url);
        setUploadInfo({
          size: data.data.size,
          originalSize: data.data.originalSize,
          width: data.data.width,
          height: data.data.height,
        });
      }
    } catch { /* silent */ } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleUpload(file);
  };

  const handleMediaSelect = (urls: string[]) => {
    if (urls.length > 0) {
      onChange(urls[0]);
      setUploadInfo(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {helpText && <p className="text-[10px] text-warm-400 mb-2">{helpText}</p>}

      {value ? (
        <div className="relative group">
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-warm-100 border border-warm-200">
            <Image src={value} alt={label} fill className="object-contain" sizes="400px" />
          </div>
          <button
            type="button"
            onClick={() => { onRemove(); setUploadInfo(null); }}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X size={14} />
          </button>
          {uploadInfo && (
            <div className="flex gap-3 mt-1.5 text-[10px] text-warm-400">
              {uploadInfo.width && uploadInfo.height && (
                <span>{uploadInfo.width}x{uploadInfo.height}px</span>
              )}
              {uploadInfo.size && <span>{formatSize(uploadInfo.size)}</span>}
              {uploadInfo.originalSize && uploadInfo.size && (
                <span className="text-green-600">
                  -{Math.round((1 - uploadInfo.size / uploadInfo.originalSize) * 100)}% risparmio
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              dragOver ? "border-warm-500 bg-warm-50" : "border-warm-300 hover:border-warm-400"
            }`}
          >
            {uploading ? (
              <Loader2 size={20} className="text-warm-400 animate-spin" />
            ) : (
              <>
                <Upload size={20} className="text-warm-400 mb-1" />
                <span className="text-xs text-warm-500">Trascina o clicca per caricare</span>
                <span className="text-[10px] text-warm-400 mt-0.5">
                  {skipCompression ? "Originale • Nessuna compressione" : "WebP auto • Alta qualita"}
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <label
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={skipCompression}
              onChange={(e) => setSkipCompression(e.target.checked)}
              className="rounded border-warm-300"
            />
            <span className="text-[11px] text-warm-500">Non comprimere (immagine gia ottimizzata)</span>
          </label>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 border border-warm-300 rounded-lg text-xs text-warm-600 hover:bg-warm-50 hover:border-warm-400 transition-colors"
          >
            <ImageIcon size={14} />
            Scegli dai Media
          </button>
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
