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

  // Pagination + sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<"createdAt" | "size" | "originalName">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Folder counts (total across all pages)
  const [allCount, setAllCount] = useState(0);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

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
  const [copied, setCopied] = useState<string | null>(null);

  // Generate variants
  const [generatingVariants, setGeneratingVariants] = useState(false);

  // Drag-and-drop
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /* --- data fetching ------------------------------------------------ */
  const fetchMedia = useCallback((folder: string, p: number, ps: number, sb: string, so: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (folder !== "__all__") params.set("folder", folder);
    params.set("page", String(p));
    params.set("pageSize", String(ps));
    params.set("sortBy", sb);
    params.set("sortOrder", so);
    fetch(`/api/media?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.data || []);
        setTotalCount(data.total ?? (data.data?.length || 0));
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

  const fetchCounts = useCallback(() => {
    fetch("/api/media/counts")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAllCount(data.data.total || 0);
          setFolderCounts(data.data.byFolder || {});
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeFolder, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    fetchMedia(activeFolder, page, pageSize, sortBy, sortOrder);
    setSelected(new Set());
  }, [activeFolder, page, pageSize, sortBy, sortOrder, fetchMedia]);

  useEffect(() => {
    fetchWasabiStatus();
    fetchCounts();
  }, [fetchWasabiStatus, fetchCounts]);

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
    fetchMedia(activeFolder, page, pageSize, sortBy, sortOrder);
    fetchWasabiStatus();
    fetchCounts();
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
    fetchMedia(activeFolder, page, pageSize, sortBy, sortOrder);
    fetchWasabiStatus();
    fetchCounts();
  };

  /* --- bulk delete --------------------------------------------------- */
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Sei sicuro di voler eliminare ${selected.size} file?`)) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      await fetch(`/api/media/${id}`, { method: "DELETE" });
    }
    setSelected(new Set());
    if (detailFile && ids.includes(detailFile.id)) setDetailFile(null);
    fetchMedia(activeFolder, page, pageSize, sortBy, sortOrder);
    fetchWasabiStatus();
    fetchCounts();
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
    fetchMedia(activeFolder, page, pageSize, sortBy, sortOrder);
    fetchWasabiStatus();
    fetchCounts();
    setTimeout(() => setSyncResult(null), 5000);
  };

  const handleSyncSingle = (id: string) => syncItems([id]);
  const handleSyncSelected = () => syncItems(Array.from(selected));

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

  const unsyncedSelected = Array.from(selected).filter(
    (id) => !files.find((f) => f.id === id)?.isSynced
  );

  const optimizationPercent = (original: number | null, processed: number) => {
    if (!original || original <= processed) return null;
    return Math.round(((original - processed) / original) * 100);
  };


  /* --- render ------------------------------------------------------- */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Media Gallery</h1>
          <p className="text-sm text-warm-500 mt-1">
            {totalCount} file {activeFolder === "__all__" ? "totali" : `nella cartella "${activeFolder}"`} &middot; pagina {page} di {Math.max(1, Math.ceil(totalCount / pageSize))} &middot; {files.length} visualizzati
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <>
              <button
                onClick={handleDeleteSelected}
                disabled={syncing}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                Elimina selezionati ({selected.size})
              </button>
              <button
                onClick={handleSyncSelected}
                disabled={syncing || unsyncedSelected.length === 0}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <CloudUpload size={16} />
                Sincronizza selezionati ({unsyncedSelected.length})
              </button>
            </>
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
            ({allCount})
          </span>
        </button>
        {MEDIA_FOLDERS.map((folder) => {
          const count = folderCounts[folder.value] || 0;
          const isActive = activeFolder === folder.value;
          return (
            <button
              key={folder.value}
              onClick={() => setActiveFolder(folder.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-warm-800 text-white"
                  : "bg-warm-100 text-warm-600 hover:bg-warm-200"
              }`}
            >
              <FolderOpen size={14} />
              {folder.label}
              <span className={`text-xs ml-1 ${isActive ? "text-warm-300" : "text-warm-400"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Select all + sort + bulk actions bar */}
      {!loading && files.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-lg shadow-sm border border-warm-200 px-4 py-2.5">
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
              Seleziona pagina
              {selected.size > 0 && (
                <span className="ml-1 text-warm-400">({selected.size} selezionati)</span>
              )}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-warm-500">
              <span>Ordina:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-warm-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-warm-500"
              >
                <option value="createdAt">Data upload</option>
                <option value="size">Dimensione</option>
                <option value="originalName">Nome</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="border border-warm-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-warm-500"
              >
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-warm-500">
              <span>Per pagina:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="border border-warm-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-warm-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-warm-400 hover:text-warm-600 transition-colors"
              >
                Deseleziona
              </button>
            )}
          </div>
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
                  <div className="w-full h-48 relative bg-warm-50">
                    {isImage(file.mimeType) ? (
                      <button
                        onClick={() => openDetail(file)}
                        className="w-full h-full relative cursor-pointer"
                      >
                        <Image
                          src={file.thumbnailUrl || file.url}
                          alt={file.altText || file.originalName}
                          fill
                          className="object-contain p-2"
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

      {/* Pagination */}
      {!loading && totalCount > pageSize && (() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        const windowSize = 5;
        const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
        const end = Math.min(totalPages, start + windowSize - 1);
        const pages: number[] = [];
        for (let i = start; i <= end; i++) pages.push(i);
        const btnBase = "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border";
        return (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 bg-white rounded-lg shadow-sm border border-warm-200 px-4 py-3">
            <div className="text-xs text-warm-500">
              {((page - 1) * pageSize) + 1}&ndash;{Math.min(page * pageSize, totalCount)} di {totalCount}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className={`${btnBase} border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                &laquo;
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`${btnBase} border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                &lsaquo; Precedente
              </button>
              {start > 1 && <span className="px-2 text-warm-400">&hellip;</span>}
              {pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`${btnBase} ${p === page ? "bg-warm-800 border-warm-800 text-white" : "border-warm-200 text-warm-600 hover:bg-warm-50"}`}
                >
                  {p}
                </button>
              ))}
              {end < totalPages && <span className="px-2 text-warm-400">&hellip;</span>}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`${btnBase} border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                Successiva &rsaquo;
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className={`${btnBase} border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                &raquo;
              </button>
            </div>
          </div>
        );
      })()}

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
                {/* Alt Text — multi-lingua */}
                <AltTextEditor file={detailFile} onFileChange={(f) => {
                  setDetailFile(f);
                  setFiles((prev) => prev.map((x) => x.id === f.id ? f : x));
                }} />

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

/* =============================================================== */
/*  AltTextEditor: multi-language alt text editor                   */
/* =============================================================== */

interface AltLanguage {
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

function AltTextEditor({ file, onFileChange }: { file: MediaFile; onFileChange: (f: MediaFile) => void }) {
  const [languages, setLanguages] = useState<AltLanguage[]>([]);
  const [defaultLang, setDefaultLang] = useState("it");
  const [activeLang, setActiveLang] = useState("it");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const langs = (d.data as AltLanguage[]).filter((l) => l.isActive);
          setLanguages(langs);
          const def = langs.find((l) => l.isDefault);
          if (def) {
            setDefaultLang(def.code);
            setActiveLang(def.code);
          }
        }
      });
  }, []);

  useEffect(() => {
    fetch(`/api/media/${file.id}/alt-translations`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const m: Record<string, string> = {};
          for (const tr of d.data as Array<{ languageCode: string; altText: string | null }>) {
            m[tr.languageCode] = tr.altText || "";
          }
          setTranslations(m);
        }
      });
  }, [file.id]);

  useEffect(() => {
    if (activeLang === defaultLang) {
      setDraft(file.altText || "");
    } else {
      setDraft(translations[activeLang] || "");
    }
  }, [activeLang, defaultLang, file.altText, translations]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeLang === defaultLang) {
        const res = await fetch(`/api/media/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ altText: draft }),
        });
        const d = await res.json();
        if (d.success) {
          onFileChange(d.data);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        const res = await fetch(`/api/media/${file.id}/alt-translations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ languageCode: activeLang, altText: draft }),
        });
        const d = await res.json();
        if (d.success) {
          setTranslations((prev) => ({ ...prev, [activeLang]: draft }));
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-warm-600 uppercase tracking-wider">
          Alt Text
        </label>
        {languages.length > 1 && (
          <select
            value={activeLang}
            onChange={(e) => setActiveLang(e.target.value)}
            className="text-xs border border-warm-300 rounded px-2 py-1 focus:border-warm-800 focus:outline-none"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}{l.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={activeLang === defaultLang
            ? "Descrizione dell'immagine per accessibilità e SEO..."
            : `Traduzione in ${activeLang.toUpperCase()} (lascia vuoto per usare la versione ${defaultLang.toUpperCase()})`}
          className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:border-warm-500"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-warm-800 text-white text-xs rounded-lg hover:bg-warm-900 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
          {saved && <span className="text-xs text-green-600 font-medium">Salvato ✓</span>}
        </div>
      </div>
    </div>
  );
}
