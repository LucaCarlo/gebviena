"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, FolderOpen } from "lucide-react";
import { MEDIA_FOLDERS } from "@/lib/constants";
import type { MediaFile } from "@/types";

export default function AdminMediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("general");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = (folder: string) => {
    setLoading(true);
    fetch(`/api/media?folder=${folder}`)
      .then((r) => r.json())
      .then((data) => { setFiles(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchMedia(activeFolder); }, [activeFolder]);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo file?")) return;
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    fetchMedia(activeFolder);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      const formData = new FormData();
      formData.append("file", fileList[i]);
      formData.append("folder", activeFolder);
      await fetch("/api/media", { method: "POST", body: formData });
    }
    setUploading(false);
    fetchMedia(activeFolder);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Media Gallery</h1>
          <p className="text-sm text-warm-500 mt-1">
            {files.length} file &middot; {formatSize(totalSize)} totali
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="media-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors disabled:opacity-50"
          >
            <Upload size={16} /> {uploading ? "Caricamento..." : "Carica file"}
          </button>
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {MEDIA_FOLDERS.map((folder) => (
          <button
            key={folder.value}
            onClick={() => setActiveFolder(folder.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFolder === folder.value
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            <FolderOpen size={14} />
            {folder.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-xl shadow-sm border border-warm-200">
          Nessun file in questa cartella
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="w-full h-40 relative bg-warm-50">
                {isImage(file.mimeType) ? (
                  <Image
                    src={file.url}
                    alt={file.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-300">
                    <FolderOpen size={40} />
                  </div>
                )}
                {/* Delete overlay */}
                <button
                  onClick={() => handleDelete(file.id)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-warm-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-warm-800 truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-warm-400">{formatSize(file.size)}</span>
                  <span className="text-xs text-warm-400">{formatDate(file.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
