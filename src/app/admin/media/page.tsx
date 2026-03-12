"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Upload,
  Trash2,
  FolderOpen,
  CloudOff,
  CheckCircle2,
  CloudUpload,
  Cloud,
  RefreshCw,
  ImageIcon,
  FileText,
  X,
  CheckSquare,
  Square,
  MinusSquare,
  Copy,
  Check,
  ExternalLink,
  Info,
  Loader2,
  Wand2,
} from "lucide-react";
import { MEDIA_FOLDERS } from "@/lib/constants";
import type { MediaFile } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WasabiStatus {
  configured: boolean;
  connected: boolean;
  total: number;
  synced: number;
  unsynced: number;
}

interface SyncResult {
  synced: number;
  failed: number;
  total: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminMediaPage() {
  /* --- state -------------------------------------------------------- */
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("__all__");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wasabi / sync
  const [wasabi, setWasabi] = useState<WasabiStatus | null>(null);
  const [wasabiLoading, setWasabiLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Detail panel
  const [detailFile, setDetailFile] = useState<MediaFile | null>(null);
  const [editingAlt, setEditingAlt] = useState(false);
  const [altText, setAltText] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Generate variants
  const [generatingVariants, setGeneratingVariants] = useState(false);

  // Drag-and-drop
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /* --- data fetching ------------------------------------------------ */
  const fetchMedia = useCallback((folder: string) => {
    setLoading(true);
    const url = folder === "__all__" ? "/api/media" : `/api/media?folder=${folder}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchWasabiStatus = useCallback(() => {
    setWasabiLoading(true);
    fetch("/api/media/sync")
      .then((r) => r.json())
      .then((data) => {
        setWasabi(data.data || data);
        setWasabiLoading(false);
      })
      .catch(() => setWasabiLoading(false));
  }, []);

  useEffect(() => {
    fetchMedia(activeFolder);
    setSelected(new Set());
  }, [activeFolder, fetchMedia]);

  useEffect(() => {
    fetchWasabiStatus();
  }, [fetchWasabiStatus]);

  /* --- upload ------------------------------------------------------- */
  const uploadFiles = async (fileList: FileList) => {
    if (fileList.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: fileList.length });

    for (let i = 0; i < fileList.length; i++) {
      const formData = new FormData();
      formData.append("file", fileList[i]);
      formData.append("folder", activeFolder === "__all__" ? "general" : activeFolder);
      await fetch("/api/media", { method: "POST", body: formData });
      setUploadProgress({ done: i + 1, total: fileList.length });
    }

    setUploading(false);
    setUploadProgress({ done: 0, total: 0 });
    fetchMedia(activeFolder);
    fetchWasabiStatus();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  /* --- drag & drop -------------------------------------------------- */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  /* --- delete ------------------------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo file?")) return;
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (detailFile?.id === id) setDetailFile(null);
    fetchMedia(activeFolder);
    fetchWasabiStatus();
  };

  /* --- sync --------------------------------------------------------- */
  const syncItems = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSyncing(true);
    setSyncProgress({ done: 0, total: ids.length });
    setSyncResult(null);

    const batchSize = 5;
    let totalSynced = 0;
    let totalFailed = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/media/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch }),
        });
        const result: { data: SyncResult } = await res.json();
        totalSynced += result.data.synced;
        totalFailed += result.data.failed;
      } catch {
        totalFailed += batch.length;
      }
      setSyncProgress({ done: Math.min(i + batchSize, ids.length), total: ids.length });
    }

    setSyncResult({ synced: totalSynced, failed: totalFailed, total: ids.length });
    setSyncing(false);
    fetchMedia(activeFolder);
    fetchWasabiStatus();
    setTimeout(() => setSyncResult(null), 5000);
  };

  const handleSyncSingle = (id: string) => syncItems([id]);
  const handleSyncSelected = () => syncItems(Array.from(selected));

  /* --- alt text ------------------------------------------------------ */
  const handleSaveAlt = async () => {
    if (!detailFile) return;
    setSavingAlt(true);
    try {
      const res = await fetch(`/api/media/${detailFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailFile(data.data);
        // Update in files list too
        setFiles((prev) => prev.map((f) => f.id === data.data.id ? data.data : f));
        setEditingAlt(false);
      }
    } catch { /* silent */ }
    setSavingAlt(false);
  };

  /* --- generate variants --------------------------------------------- */
  const handleGenerateVariants = async () => {
    if (!detailFile) return;
    setGeneratingVariants(true);
    try {
      const res = await fetch(`/api/media/${detailFile.id}/variants`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDetailFile(data.data);
        setFiles((prev) => prev.map((f) => f.id === data.data.id ? data.data : f));
      } else {
        alert(data.error || "Errore nella generazione delle varianti");
      }
    } catch (e) {
      alert("Errore di rete nella generazione delle varianti");
      console.error("Generate variants error:", e);
    }
    setGeneratingVariants(false);
  };

  /* --- clipboard ---------------------------------------------------- */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  /* --- selection ---------------------------------------------------- */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.id)));
    }
  };

  const isAllSelected = files.length > 0 && selected.size === files.length;
  const isSomeSelected = selected.size > 0 && selected.size < files.length;

  /* --- open detail -------------------------------------------------- */
  const openDetail = (file: MediaFile) => {
    setDetailFile(file);
    setAltText(file.altText || "");
    setEditingAlt(false);
  };

  /* --- helpers ------------------------------------------------------ */
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const unsyncedSelected = Array.from(selected).filter(
    (id) => !files.find((f) => f.id === id)?.isSynced
  );

  const optimizationPercent = (original: number | null, processed: number) => {
    if (!original || original <= processed) return null;
    return Math.round(((original - processed) / original) * 100);
  };

  const folderCounts = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.folder] = (acc[f.folder] || 0) + 1;
    return acc;
  }, {});

  /* --- render ------------------------------------------------------- */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Media Gallery</h1>
          <p className="text-sm text-warm-500 mt-1">
            {files.length} file &middot; {formatSize(totalSize)} totali
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={handleSyncSelected}
              disabled={syncing || unsyncedSelected.length === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <CloudUpload size={16} />
              Sincronizza selezionati ({unsyncedSelected.length})
            </button>
          )}
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

      {/* Wasabi connection status */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-warm-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud size={20} className="text-warm-400" />
            <div>
              <span className="text-sm font-medium text-warm-800">Wasabi Cloud Storage</span>
              {wasabiLoading ? (
                <span className="ml-3 text-xs text-warm-400">Verifica connessione...</span>
              ) : wasabi ? (
                <div className="flex items-center gap-4 mt-0.5">
                  {wasabi.configured ? (
                    wasabi.connected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Connesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Disconnesso
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-warm-500 bg-warm-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-warm-400 rounded-full" />
                      Non configurato
                    </span>
                  )}
                  {wasabi.configured && (
                    <span className="text-xs text-warm-500">
                      {wasabi.synced}/{wasabi.total} sincronizzati &middot;{" "}
                      {wasabi.unsynced} da sincronizzare
                    </span>
                  )}
                </div>
              ) : (
                <span className="ml-3 text-xs text-red-500">Errore di connessione</span>
              )}
            </div>
          </div>
          <button
            onClick={fetchWasabiStatus}
            disabled={wasabiLoading}
            className="p-2 text-warm-400 hover:text-warm-600 transition-colors disabled:opacity-50"
            title="Aggiorna stato"
          >
            <RefreshCw size={16} className={wasabiLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Upload / sync progress */}
      {(uploading || syncing) && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-warm-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-warm-700">
              {uploading
                ? `Caricamento file ${uploadProgress.done}/${uploadProgress.total}...`
                : `Sincronizzazione ${syncProgress.done}/${syncProgress.total}...`}
            </span>
            <span className="text-xs text-warm-500">
              {uploading
                ? `${Math.round((uploadProgress.done / (uploadProgress.total || 1)) * 100)}%`
                : `${Math.round((syncProgress.done / (syncProgress.total || 1)) * 100)}%`}
            </span>
          </div>
          <div className="w-full bg-warm-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                uploading ? "bg-warm-800" : "bg-blue-600"
              }`}
              style={{
                width: `${
                  uploading
                    ? (uploadProgress.done / (uploadProgress.total || 1)) * 100
                    : (syncProgress.done / (syncProgress.total || 1)) * 100
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sync result toast */}
      {syncResult && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-warm-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm text-warm-700">
              Sincronizzazione completata: {syncResult.synced} riusciti
              {syncResult.failed > 0 && (
                <span className="text-red-600">, {syncResult.failed} falliti</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="p-1 text-warm-400 hover:text-warm-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Folder tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveFolder("__all__")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeFolder === "__all__"
              ? "bg-warm-800 text-white"
              : "bg-warm-100 text-warm-600 hover:bg-warm-200"
          }`}
        >
          <FolderOpen size={14} />
          Tutti
          <span className={`text-xs ml-1 ${activeFolder === "__all__" ? "text-warm-300" : "text-warm-400"}`}>
            ({files.length})
          </span>
        </button>
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
            {activeFolder === "__all__" && folderCounts[folder.value] ? (
              <span className="text-xs ml-1 text-warm-400">
                ({folderCounts[folder.value]})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Select all + bulk actions bar */}
      {!loading && files.length > 0 && (
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg shadow-sm border border-warm-200 px-4 py-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              onClick={toggleSelectAll}
              className="text-warm-400 hover:text-warm-600 transition-colors"
            >
              {isAllSelected ? (
                <CheckSquare size={18} className="text-warm-800" />
              ) : isSomeSelected ? (
                <MinusSquare size={18} className="text-warm-600" />
              ) : (
                <Square size={18} />
              )}
            </button>
            <span className="text-sm text-warm-600">
              Seleziona tutto
              {selected.size > 0 && (
                <span className="ml-1 text-warm-400">({selected.size} selezionati)</span>
              )}
            </span>
          </label>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-warm-400 hover:text-warm-600 transition-colors"
              >
                Deseleziona
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drop zone + file grid */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl transition-colors ${
          dragOver ? "ring-2 ring-warm-400 ring-offset-2 bg-warm-50" : ""
        }`}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-warm-50/90 rounded-xl border-2 border-dashed border-warm-400">
            <div className="text-center">
              <Upload size={40} className="mx-auto text-warm-400 mb-2" />
              <p className="text-warm-600 font-medium">Rilascia i file qui per caricarli</p>
              <p className="text-warm-400 text-sm mt-1">nella cartella &quot;{activeFolder === "__all__" ? "general" : activeFolder}&quot;</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-warm-400 py-16 text-center">Caricamento...</div>
        ) : files.length === 0 ? (
          <div
            className="text-center py-16 text-warm-400 bg-white rounded-xl shadow-sm border border-warm-200 cursor-pointer hover:border-warm-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-warm-300" />
            <p>Nessun file in questa cartella</p>
            <p className="text-xs mt-1">
              Clicca o trascina file qui per caricarli
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => {
              const isSelected = selected.has(file.id);
              const savings = optimizationPercent(file.originalSize, file.size);

              return (
                <div
                  key={file.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden group transition-all ${
                    isSelected
                      ? "border-warm-800 ring-1 ring-warm-800"
                      : detailFile?.id === file.id
                        ? "border-blue-500 ring-1 ring-blue-500"
                        : "border-warm-200 hover:border-warm-300"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-full h-40 relative bg-warm-50">
                    {isImage(file.mimeType) ? (
                      <button
                        onClick={() => openDetail(file)}
                        className="w-full h-full relative cursor-pointer"
                      >
                        <Image
                          src={file.thumbnailUrl || file.url}
                          alt={file.altText || file.originalName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </button>
                    ) : (
                      <button
                        onClick={() => openDetail(file)}
                        className="w-full h-full flex items-center justify-center text-warm-300 cursor-pointer"
                      >
                        <FileText size={40} />
                      </button>
                    )}

                    {/* Top-left: checkbox */}
                    <button
                      onClick={() => toggleSelect(file.id)}
                      className={`absolute top-2 left-2 p-0.5 rounded transition-all ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="text-warm-800 drop-shadow" />
                      ) : (
                        <Square
                          size={20}
                          className="text-white drop-shadow"
                        />
                      )}
                    </button>

                    {/* Top-right: sync status icon */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {file.isSynced ? (
                        <span
                          title={`Sincronizzato il ${file.syncedAt ? formatDate(file.syncedAt) : ""}`}
                          className="p-1 bg-white/90 rounded-lg shadow-sm"
                        >
                          <CheckCircle2 size={14} className="text-emerald-600" />
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSyncSingle(file.id)}
                          disabled={syncing}
                          title="Sincronizza su Wasabi"
                          className="p-1 bg-white/90 rounded-lg shadow-sm text-warm-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          <CloudUpload size={14} />
                        </button>
                      )}
                    </div>

                    {/* Dimensions badge */}
                    {file.width && file.height && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                        <ImageIcon size={10} />
                        {file.width}&times;{file.height}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p
                      className="text-sm font-medium text-warm-800 truncate"
                      title={file.originalName}
                    >
                      {file.originalName}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-warm-400">{formatSize(file.size)}</span>
                      <span className="text-xs text-warm-400">{formatDate(file.createdAt)}</span>
                    </div>

                    {/* Optimization stats */}
                    {file.originalSize && file.originalSize > file.size && (
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-warm-400">
                            {formatSize(file.originalSize)} &rarr; {formatSize(file.size)}
                          </span>
                          {savings !== null && (
                            <span className="text-emerald-600 font-semibold">
                              -{savings}%
                            </span>
                          )}
                        </div>
                        {savings !== null && (
                          <div className="w-full bg-warm-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${savings}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Variants indicator */}
                    {(file.thumbnailUrl || file.mediumUrl) && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <Info size={10} className="text-blue-400 shrink-0" />
                        <span className="text-[10px] text-blue-500">
                          {[file.thumbnailUrl && "thumb", file.mediumUrl && "medium"].filter(Boolean).join(" + ")} + large
                        </span>
                      </div>
                    )}

                    {/* Sync status line */}
                    <div className="mt-1 flex items-center gap-1">
                      {file.isSynced ? (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                          <span className="text-[10px] text-emerald-600">Sincronizzato</span>
                        </>
                      ) : (
                        <>
                          <CloudOff size={11} className="text-warm-300 shrink-0" />
                          <span className="text-[10px] text-warm-400">Non sincronizzato</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/*  DETAIL PANEL (replaces the old lightbox)                      */}
      {/* ============================================================= */}
      {detailFile && (
        <div
          className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailFile(null)}
          onKeyDown={(e) => e.key === "Escape" && setDetailFile(null)}
          role="dialog"
          tabIndex={0}
        >
          {/* Panel container */}
          <div
            className="ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200 bg-warm-50">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-warm-800 truncate">
                  {detailFile.originalName}
                </h2>
                <p className="text-xs text-warm-400 mt-0.5">
                  {formatDate(detailFile.createdAt)} &middot; {detailFile.folder}
                </p>
              </div>
              <button
                onClick={() => setDetailFile(null)}
                className="p-2 hover:bg-warm-200 rounded-lg transition-colors shrink-0 ml-3"
              >
                <X size={20} className="text-warm-500" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Image preview */}
              {isImage(detailFile.mimeType) && (
                <div className="relative bg-warm-100 flex items-center justify-center" style={{ minHeight: "300px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailFile.url}
                    alt={detailFile.altText || detailFile.originalName}
                    className="max-w-full max-h-[50vh] object-contain"
                  />
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Alt Text */}
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
                    Alt Text
                  </label>
                  {editingAlt ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        placeholder="Descrizione dell'immagine per accessibilita e SEO..."
                        className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:border-warm-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAlt}
                          disabled={savingAlt}
                          className="px-3 py-1.5 bg-warm-800 text-white text-xs rounded-lg hover:bg-warm-900 transition-colors disabled:opacity-50"
                        >
                          {savingAlt ? "Salvataggio..." : "Salva"}
                        </button>
                        <button
                          onClick={() => { setEditingAlt(false); setAltText(detailFile.altText || ""); }}
                          className="px-3 py-1.5 text-xs text-warm-600 hover:text-warm-800 transition-colors"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingAlt(true)}
                      className="px-3 py-2 border border-warm-200 rounded-lg text-sm text-warm-600 cursor-pointer hover:border-warm-400 transition-colors min-h-[38px] flex items-center"
                    >
                      {detailFile.altText || (
                        <span className="text-warm-400 italic">Clicca per aggiungere alt text...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
                    URL Immagine
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-warm-50 border border-warm-200 rounded-lg text-xs text-warm-600 font-mono truncate">
                      {detailFile.wasabiUrl || detailFile.url}
                    </div>
                    <button
                      onClick={() => copyToClipboard(detailFile.wasabiUrl || detailFile.url, "url")}
                      className="p-2 border border-warm-200 rounded-lg hover:bg-warm-50 transition-colors shrink-0"
                      title="Copia URL"
                    >
                      {copied === "url" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-warm-400" />}
                    </button>
                    <a
                      href={detailFile.wasabiUrl || detailFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border border-warm-200 rounded-lg hover:bg-warm-50 transition-colors shrink-0"
                      title="Apri in nuova tab"
                    >
                      <ExternalLink size={14} className="text-warm-400" />
                    </a>
                  </div>
                </div>

                {/* Image info */}
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
                    Informazioni
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {detailFile.width && detailFile.height && (
                      <div className="px-3 py-2.5 bg-warm-50 rounded-lg">
                        <p className="text-[10px] text-warm-400 uppercase tracking-wider">Dimensioni</p>
                        <p className="text-sm font-medium text-warm-800 mt-0.5">
                          {detailFile.width} &times; {detailFile.height}px
                        </p>
                      </div>
                    )}
                    <div className="px-3 py-2.5 bg-warm-50 rounded-lg">
                      <p className="text-[10px] text-warm-400 uppercase tracking-wider">Peso (Large)</p>
                      <p className="text-sm font-medium text-warm-800 mt-0.5">{formatSize(detailFile.size)}</p>
                    </div>
                    {detailFile.originalSize && (
                      <div className="px-3 py-2.5 bg-warm-50 rounded-lg">
                        <p className="text-[10px] text-warm-400 uppercase tracking-wider">Originale</p>
                        <p className="text-sm font-medium text-warm-800 mt-0.5">{formatSize(detailFile.originalSize)}</p>
                      </div>
                    )}
                    <div className="px-3 py-2.5 bg-warm-50 rounded-lg">
                      <p className="text-[10px] text-warm-400 uppercase tracking-wider">Formato</p>
                      <p className="text-sm font-medium text-warm-800 mt-0.5">{detailFile.mimeType}</p>
                    </div>
                  </div>
                </div>

                {/* Variants section */}
                {isImage(detailFile.mimeType) && (
                  <div>
                    <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
                      Varianti
                    </label>
                    <div className="space-y-2">
                      {/* Large (the main processed file) */}
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            <ImageIcon size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-warm-800">Large</p>
                            <p className="text-[10px] text-warm-400">Qualita massima &middot; Hero, zoom, full-screen</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-warm-800">{formatSize(detailFile.size)}</p>
                          {detailFile.width && detailFile.height && (
                            <p className="text-[10px] text-warm-400">{detailFile.width}&times;{detailFile.height}</p>
                          )}
                        </div>
                      </div>

                      {/* Medium */}
                      <div className="flex items-center justify-between px-4 py-3 bg-warm-50 border border-warm-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-warm-100 rounded flex items-center justify-center">
                            <ImageIcon size={14} className="text-warm-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-warm-800">Medium</p>
                            <p className="text-[10px] text-warm-400">800px max &middot; Card, listing, anteprima</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {detailFile.mediumSize ? (
                            <>
                              <p className="text-sm font-semibold text-warm-800">{formatSize(detailFile.mediumSize)}</p>
                              {detailFile.mediumUrl && (
                                <button
                                  onClick={() => copyToClipboard(detailFile.mediumUrl!, "medium")}
                                  className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 ml-auto"
                                >
                                  {copied === "medium" ? <Check size={8} /> : <Copy size={8} />}
                                  URL
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-warm-400 italic">Da generare</span>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="flex items-center justify-between px-4 py-3 bg-warm-50 border border-warm-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-warm-100 rounded flex items-center justify-center">
                            <ImageIcon size={14} className="text-warm-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-warm-800">Thumbnail</p>
                            <p className="text-[10px] text-warm-400">400px max &middot; Griglia, miniatura</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {detailFile.thumbnailSize ? (
                            <>
                              <p className="text-sm font-semibold text-warm-800">{formatSize(detailFile.thumbnailSize)}</p>
                              {detailFile.thumbnailUrl && (
                                <button
                                  onClick={() => copyToClipboard(detailFile.thumbnailUrl!, "thumb")}
                                  className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 ml-auto"
                                >
                                  {copied === "thumb" ? <Check size={8} /> : <Copy size={8} />}
                                  URL
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-warm-400 italic">Da generare</span>
                          )}
                        </div>
                      </div>

                      {/* Generate variants button (when missing) */}
                      {(!detailFile.mediumUrl || !detailFile.thumbnailUrl) && (
                        <button
                          onClick={handleGenerateVariants}
                          disabled={generatingVariants}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-50 border border-violet-200 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-60"
                        >
                          {generatingVariants ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              Generazione in corso...
                            </>
                          ) : (
                            <>
                              <Wand2 size={15} />
                              Genera varianti mancanti
                            </>
                          )}
                        </button>
                      )}

                      {/* Savings summary */}
                      {detailFile.originalSize && detailFile.thumbnailSize && detailFile.mediumSize && (
                        <div className="mt-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-emerald-700 font-medium">Risparmio totale (3 varianti vs 3x originale)</span>
                            <span className="text-xs font-bold text-emerald-700">
                              -{Math.round((1 - (detailFile.size + detailFile.mediumSize + detailFile.thumbnailSize) / (detailFile.originalSize * 3)) * 100)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            {formatSize(detailFile.originalSize * 3)} &rarr; {formatSize(detailFile.size + detailFile.mediumSize + detailFile.thumbnailSize)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sync status */}
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
                    Cloud Storage
                  </label>
                  {detailFile.isSynced ? (
                    <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Sincronizzato su Wasabi</p>
                        {detailFile.syncedAt && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            Ultimo sync: {formatDate(detailFile.syncedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CloudOff size={18} className="text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Non sincronizzato</p>
                          <p className="text-[10px] text-amber-600 mt-0.5">Solo storage locale</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSyncSingle(detailFile.id)}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <CloudUpload size={12} />
                        Sincronizza
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-warm-200 bg-warm-50 flex items-center justify-between">
              <button
                onClick={() => handleDelete(detailFile.id)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Elimina
              </button>
              <button
                onClick={() => setDetailFile(null)}
                className="px-4 py-2 bg-warm-800 text-white text-sm rounded-lg hover:bg-warm-900 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
