"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Type,
  ImageIcon,
  LayoutTemplate,
  Grid3x3,
  GalleryHorizontal,
  Quote,
  Video,
  Minus,
} from "lucide-react";
import {
  NewsBlock,
  NewsBlockType,
  TextBlockData,
  ImageBlockData,
  ImageTextBlockData,
  GalleryBlockData,
  SlideshowBlockData,
  QuoteBlockData,
  VideoBlockData,
  SeparatorBlockData,
} from "@/types";
import TextBlockEditor from "./TextBlockEditor";
import ImageBlockEditor from "./ImageBlockEditor";
import ImageTextBlockEditor from "./ImageTextBlockEditor";
import GalleryBlockEditor from "./GalleryBlockEditor";
import SlideshowBlockEditor from "./SlideshowBlockEditor";
import QuoteBlockEditor from "./QuoteBlockEditor";
import VideoBlockEditor from "./VideoBlockEditor";
import SeparatorBlockEditor from "./SeparatorBlockEditor";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface BlockTypeMenuItem {
  type: NewsBlockType;
  icon: React.ElementType;
  label: string;
}

const BLOCK_TYPE_MENU: BlockTypeMenuItem[] = [
  { type: "text", icon: Type, label: "Testo" },
  { type: "image", icon: ImageIcon, label: "Immagine" },
  { type: "image_text", icon: LayoutTemplate, label: "Immagine + Testo" },
  { type: "gallery", icon: Grid3x3, label: "Galleria" },
  { type: "slideshow", icon: GalleryHorizontal, label: "Slideshow" },
  { type: "quote", icon: Quote, label: "Citazione" },
  { type: "video", icon: Video, label: "Video" },
  { type: "separator", icon: Minus, label: "Separatore" },
];

const BLOCK_TYPE_LABELS: Record<NewsBlockType, string> = {
  text: "Testo",
  image: "Immagine",
  image_text: "Immagine + Testo",
  gallery: "Galleria",
  slideshow: "Slideshow",
  quote: "Citazione",
  video: "Video",
  separator: "Separatore",
};

function getDefaultData(type: NewsBlockType): NewsBlock["data"] {
  switch (type) {
    case "text":
      return { body: "" } satisfies TextBlockData;
    case "image":
      return { images: [], layout: "full", caption: "" } satisfies ImageBlockData;
    case "image_text":
      return {
        images: [],
        text: "",
        title: "",
        imagePosition: "left",
        layout: "50-50",
      } satisfies ImageTextBlockData;
    case "gallery":
      return { images: [], columns: 3 } satisfies GalleryBlockData;
    case "slideshow":
      return { images: [] } satisfies SlideshowBlockData;
    case "quote":
      return { text: "", author: "", style: "default" } satisfies QuoteBlockData;
    case "video":
      return { url: "", caption: "" } satisfies VideoBlockData;
    case "separator":
      return { height: "medium" } satisfies SeparatorBlockData;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BlockBuilderProps {
  value: string;
  onChange: (json: string) => void;
}

export default function BlockBuilder({ value, onChange }: BlockBuilderProps) {
  /* ---- state ---- */
  const [blocks, setBlocks] = useState<NewsBlock[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Sync blocks -> JSON string (parent form) */
  const commit = useCallback(
    (next: NewsBlock[]) => {
      setBlocks(next);
      onChange(JSON.stringify(next));
    },
    [onChange],
  );

  /* Sync incoming value prop changes (e.g. when loading from API) */
  useEffect(() => {
    try {
      const raw = value ? JSON.parse(value) : [];
      const parsed = Array.isArray(raw) ? raw : [];
      // Only update if the incoming JSON is genuinely different
      if (JSON.stringify(parsed) !== JSON.stringify(blocks)) {
        setBlocks(parsed);
      }
    } catch {
      /* ignore invalid JSON */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /* ---- handlers ---- */

  const addBlock = (type: NewsBlockType) => {
    const newBlock: NewsBlock = {
      id: crypto.randomUUID(),
      type,
      data: getDefaultData(type),
    };
    commit([...blocks, newBlock]);
    setMenuOpen(false);
    // New blocks start expanded — make sure it's not in collapsed set
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(newBlock.id);
      return next;
    });
  };

  const updateBlock = (id: string, data: NewsBlock["data"]) => {
    commit(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  };

  const deleteBlock = (id: string) => {
    commit(blocks.filter((b) => b.id !== id));
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- render helpers ---- */

  const renderBlockEditor = (block: NewsBlock) => {
    switch (block.type) {
      case "text":
        return (
          <TextBlockEditor
            data={block.data as TextBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "image":
        return (
          <ImageBlockEditor
            data={block.data as ImageBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "image_text":
        return (
          <ImageTextBlockEditor
            data={block.data as ImageTextBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "gallery":
        return (
          <GalleryBlockEditor
            data={block.data as GalleryBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "slideshow":
        return (
          <SlideshowBlockEditor
            data={block.data as SlideshowBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "quote":
        return (
          <QuoteBlockEditor
            data={block.data as QuoteBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "video":
        return (
          <VideoBlockEditor
            data={block.data as VideoBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      case "separator":
        return (
          <SeparatorBlockEditor
            data={block.data as SeparatorBlockData}
            onChange={(d) => updateBlock(block.id, d)}
          />
        );
      default:
        return <p className="text-sm text-warm-400">Tipo di blocco non supportato.</p>;
    }
  };

  /* ---- render ---- */

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const isCollapsed = collapsedIds.has(block.id);
        const menuItem = BLOCK_TYPE_MENU.find((m) => m.type === block.type);
        const IconComp = menuItem?.icon;

        return (
          <div
            key={block.id}
            className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden"
          >
            {/* Block header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-100 bg-warm-50/50">
              {/* Drag handle (visual only for now) */}
              <GripVertical size={16} className="text-warm-400 cursor-grab flex-shrink-0" />

              {/* Type badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-100 text-warm-700 text-xs font-medium rounded-full">
                {IconComp && <IconComp size={12} />}
                {BLOCK_TYPE_LABELS[block.type]}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Move up */}
              <button
                type="button"
                onClick={() => moveBlock(index, "up")}
                disabled={index === 0}
                className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Sposta su"
              >
                <ArrowUp size={14} />
              </button>

              {/* Move down */}
              <button
                type="button"
                onClick={() => moveBlock(index, "down")}
                disabled={index === blocks.length - 1}
                className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Sposta giu"
              >
                <ArrowDown size={14} />
              </button>

              {/* Collapse / Expand */}
              <button
                type="button"
                onClick={() => toggleCollapse(block.id)}
                className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
                title={isCollapsed ? "Espandi" : "Comprimi"}
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="p-1.5 rounded text-warm-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Elimina sezione"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Block body (collapsible) */}
            {!isCollapsed && (
              <div className="px-4 py-4">
                {renderBlockEditor(block)}
              </div>
            )}
          </div>
        );
      })}

      {/* Add block button + dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 rounded-xl text-sm text-warm-500 hover:border-warm-400 hover:text-warm-700 hover:bg-warm-50 transition-colors"
        >
          <Plus size={16} />
          Aggiungi sezione
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-warm-200 z-20 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-warm-100">
              {BLOCK_TYPE_MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => addBlock(item.type)}
                    className="flex flex-col items-center gap-1.5 px-3 py-4 bg-white text-warm-600 hover:bg-warm-50 hover:text-warm-800 transition-colors"
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
