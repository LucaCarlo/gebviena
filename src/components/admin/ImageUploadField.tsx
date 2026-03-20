"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon, Crop } from "lucide-react";
import MediaPickerModal from "./MediaPickerModal";
import ImageCropModal from "./ImageCropModal";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  purpose?: string;
  folder?: string;
  helpText?: string;
  recommendedSize?: string; // e.g. "960x1200px"
  aspectRatio?: number; // width/height — enables crop tool
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  onRemove,
  purpose = "general",
  folder = "general",
  helpText,
  recommendedSize,
  aspectRatio,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skipCompression, setSkipCompression] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{ size?: number; originalSize?: number; width?: number; height?: number } | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadBlob = async (blob: Blob, filename: string) => {
    setUploading(true);
    setUploadInfo(null);
    const formData = new FormData();
    formData.append("file", blob, filename);
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

  const handleUpload = async (file: File) => {
    // If aspectRatio is set, check if image needs cropping
    if (aspectRatio) {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const currentRatio = img.naturalWidth / img.naturalHeight;
        const tolerance = 0.15; // 15% tolerance
        if (Math.abs(currentRatio - aspectRatio) / aspectRatio > tolerance) {
          // Needs cropping — show crop modal
          setCropSrc(url);
          setCropOpen(true);
        } else {
          // Aspect ratio is close enough — upload directly
          URL.revokeObjectURL(url);
          uploadBlob(file, file.name);
        }
      };
      img.src = url;
      return;
    }
    uploadBlob(file, file.name);
  };

  const handleCrop = (blob: Blob) => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc("");
    uploadBlob(blob, `cropped-${Date.now()}.png`);
  };

  const handleCropClose = () => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  };

  // Manual crop on existing image
  const handleManualCrop = () => {
    if (value && aspectRatio) {
      setCropSrc(value);
      setCropOpen(true);
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
      {helpText && <p className="text-[10px] text-warm-400 mb-1">{helpText}</p>}
      {recommendedSize && (
        <p className="text-[10px] text-warm-500 mb-2 font-medium">
          Dimensione consigliata: {recommendedSize}
        </p>
      )}

      {value ? (
        <div className="relative group">
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-warm-100 border border-warm-200">
            <Image src={value} alt={label} fill className="object-contain" sizes="400px" unoptimized />
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-7 h-7 bg-warm-800 text-white rounded-full flex items-center justify-center hover:bg-warm-900"
              title="Carica nuova immagine"
            >
              <Upload size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-7 h-7 bg-warm-800 text-white rounded-full flex items-center justify-center hover:bg-warm-900"
              title="Scegli dai Media"
            >
              <ImageIcon size={13} />
            </button>
            {aspectRatio && (
              <button
                type="button"
                onClick={handleManualCrop}
                className="w-7 h-7 bg-warm-800 text-white rounded-full flex items-center justify-center hover:bg-warm-900"
                title="Ritaglia"
              >
                <Crop size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => { onRemove(); setUploadInfo(null); }}
              className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              title="Rimuovi"
            >
              <X size={14} />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
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

      {aspectRatio && (
        <ImageCropModal
          open={cropOpen}
          imageSrc={cropSrc}
          aspectRatio={aspectRatio}
          onCrop={handleCrop}
          onClose={handleCropClose}
        />
      )}
    </div>
  );
}
