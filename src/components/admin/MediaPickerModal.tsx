"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, Search, Check, FolderOpen, FileText } from "lucide-react";
import { MEDIA_FOLDERS } from "@/lib/constants";
import type { MediaFile } from "@/types";

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  imagesOnly?: boolean;
  defaultFolder?: string;
}

const PAGE_SIZE = 50;

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  multiple = false,
  imagesOnly = false,
  defaultFolder,
}: MediaPickerModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFolder, setActiveFolder] = useState(defaultFolder || "");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [productsIndex, setProductsIndex] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    fetch("/api/products?limit=10000")
      .then((r) => r.json())
      .then((d) => {
        const idx: Record<string, string> = {};
        for (const p of (d.data || [])) if (p.slug) idx[p.slug] = p.name || p.slug;
        setProductsIndex(idx);
      })
      .catch(() => { /* silent */ });
  }, [open]);

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const params = new URLSearchParams();
      if (activeFolder) params.set("folder", activeFolder);
      if (search) params.set("search", search);
      params.set("page", String(pageToLoad));
      params.set("pageSize", String(PAGE_SIZE));
      if (activeFolder === "products") {
        params.set("sortBy", "url");
        params.set("sortOrder", "asc");
      }
      const res = await fetch(`/api/media?${params}`);
      return res.json();
    },
    [activeFolder, search]
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPage(1);
      if (data.success) {
        setFiles(data.data || []);
        setTotal(data.total || 0);
        setPage(1);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await fetchPage(next);
      if (data.success) {
        setFiles((prev) => [...prev, ...(data.data || [])]);
        setTotal(data.total || 0);
        setPage(next);
      }
    } catch { /* silent */ }
    setLoadingMore(false);
  }, [fetchPage, page]);

  // On open: reset selected + apply default folder (once per open)
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      if (defaultFolder !== undefined) setActiveFolder(defaultFolder);
    }
  }, [open, defaultFolder]);

  // Reload page 1 whenever the query (activeFolder/search via loadFirstPage) changes
  useEffect(() => {
    if (open) loadFirstPage();
  }, [open, loadFirstPage]);

  const hasMore = files.length < total;

  const toggleSelect = (url: string) => {
    if (multiple) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        return next;
      });
    } else {
      onSelect([url]);
      onClose();
    }
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-4xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-800">Scegli dai Media</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-warm-100 rounded-lg transition-colors">
            <X size={20} className="text-warm-500" />
          </button>
        </div>

        {/* Toolbar: search + folders */}
        <div className="px-6 py-3 border-b border-warm-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              placeholder="Cerca file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:border-warm-500"
            />
          </div>
          <div className="flex flex-wrap gap-1 w-full">
            <button
              type="button"
              onClick={() => setActiveFolder("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFolder === "" ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-600 hover:bg-warm-200"
              }`}
            >
              Tutti
            </button>
            {MEDIA_FOLDERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFolder(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFolder === f.value ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-warm-400">
              <FolderOpen size={24} className="mb-2" />
              <p className="text-sm">Nessun media trovato</p>
            </div>
          ) : (
            <>
            {(() => {
              const visibleFiles = imagesOnly
                ? files.filter((f) => f.mimeType.startsWith("image/"))
                : files;
              const renderTile = (file: MediaFile) => {
                const isSelected = selected.has(file.url);
                const isImg = file.mimeType.startsWith("image/");
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => toggleSelect(file.url)}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all aspect-square ${
                      isSelected
                        ? "border-warm-800 ring-2 ring-warm-400"
                        : "border-warm-200 hover:border-warm-400"
                    }`}
                  >
                    {isImg ? (
                      <Image
                        src={file.url}
                        alt={file.originalName}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-warm-50 p-2">
                        <FileText size={28} className="text-warm-400" />
                        <span className="text-[9px] text-warm-600 font-medium uppercase">
                          {(file.originalName.split(".").pop() || "file").slice(0, 4)}
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-warm-800/30 flex items-center justify-center">
                        <div className="w-7 h-7 bg-warm-800 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate">{file.originalName}</p>
                    </div>
                  </button>
                );
              };

              if (activeFolder === "products") {
                const byProduct: Record<string, MediaFile[]> = {};
                const others: MediaFile[] = [];
                for (const f of visibleFiles) {
                  const m = f.url.match(/\/uploads\/products\/([^/]+)\//);
                  if (m) {
                    if (!byProduct[m[1]]) byProduct[m[1]] = [];
                    byProduct[m[1]].push(f);
                  } else {
                    others.push(f);
                  }
                }
                const keys = Object.keys(byProduct).sort((a, b) => {
                  const na = (productsIndex[a] || a).toLowerCase();
                  const nb = (productsIndex[b] || b).toLowerCase();
                  return na.localeCompare(nb);
                });
                return (
                  <div className="space-y-5">
                    {keys.map((slug) => (
                      <div key={slug}>
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-warm-200">
                          <FolderOpen size={13} className="text-warm-500 shrink-0" />
                          <h3 className="text-xs font-semibold text-warm-800">{productsIndex[slug] || slug}</h3>
                          <span className="text-[10px] text-warm-400 font-normal">/{slug}</span>
                          <span className="ml-auto text-[10px] text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded-full">
                            {byProduct[slug].length}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                          {byProduct[slug].map(renderTile)}
                        </div>
                      </div>
                    ))}
                    {others.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-warm-200">
                          <FolderOpen size={13} className="text-warm-400 shrink-0" />
                          <h3 className="text-xs font-semibold text-warm-600">Altri (senza prodotto)</h3>
                          <span className="ml-auto text-[10px] text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded-full">{others.length}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                          {others.map(renderTile)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {visibleFiles.map(renderTile)}
                </div>
              );
            })()}
            {hasMore && (
              <div className="flex justify-center mt-5">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore && (
                    <span className="w-3.5 h-3.5 border-2 border-warm-400 border-t-warm-800 rounded-full animate-spin" />
                  )}
                  {loadingMore ? "Caricamento..." : `Carica altri (${files.length} di ${total})`}
                </button>
              </div>
            )}
            </>
          )}
        </div>

        {/* Footer (only for multiple mode) */}
        {multiple && (
          <div className="px-6 py-4 border-t border-warm-200 flex items-center justify-between">
            <span className="text-sm text-warm-500">
              {selected.size} {selected.size === 1 ? "immagine selezionata" : "immagini selezionate"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-warm-600 hover:text-warm-800 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="px-4 py-2 bg-warm-800 text-white text-sm rounded-lg hover:bg-warm-900 transition-colors disabled:opacity-50"
              >
                Conferma
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
