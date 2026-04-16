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
  LayoutTemplate,
  Grid3x3,
  Image as ImageIcon,
  AlignCenter,
  Maximize2,
} from "lucide-react";
import type {
  CampaignBlock,
  CampaignBlockType,
  CampaignParagraphData,
  CampaignImageTextData,
  CampaignThreeImagesData,
  CampaignSingleImageData,
  CampaignImageWithParagraphData,
  CampaignFullwidthBannerData,
} from "@/types";
import ParagraphBlockEditor from "./ParagraphBlockEditor";
import ImageTextBlockEditor from "./ImageTextBlockEditor";
import ThreeImagesBlockEditor from "./ThreeImagesBlockEditor";
import SingleImageBlockEditor from "./SingleImageBlockEditor";
import ImageWithParagraphBlockEditor from "./ImageWithParagraphBlockEditor";
import FullwidthBannerBlockEditor from "./FullwidthBannerBlockEditor";

const BLOCK_TYPE_MENU: { type: CampaignBlockType; icon: React.ElementType; label: string }[] = [
  { type: "paragraph", icon: Type, label: "Paragrafo" },
  { type: "image_text", icon: LayoutTemplate, label: "Immagine + Testo" },
  { type: "three_images", icon: Grid3x3, label: "Tre immagini" },
  { type: "single_image", icon: ImageIcon, label: "Immagine singola" },
  { type: "image_with_paragraph", icon: AlignCenter, label: "Immagine + paragrafo centrato" },
  { type: "fullwidth_banner", icon: Maximize2, label: "Banner full-width con testo" },
];

const LABELS: Record<CampaignBlockType, string> = {
  paragraph: "Paragrafo",
  image_text: "Immagine + Testo",
  three_images: "Tre immagini",
  single_image: "Immagine singola",
  image_with_paragraph: "Immagine + paragrafo centrato",
  fullwidth_banner: "Banner full-width con testo",
};

function getDefaultData(type: CampaignBlockType): CampaignBlock["data"] {
  switch (type) {
    case "paragraph":
      return { title: "", body: "" } satisfies CampaignParagraphData;
    case "image_text":
      return { title: "", text: "", imageUrl: "", imagePosition: "left" } satisfies CampaignImageTextData;
    case "three_images":
      return { images: [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }] } satisfies CampaignThreeImagesData;
    case "single_image":
      return { imageUrl: "", caption: "" } satisfies CampaignSingleImageData;
    case "image_with_paragraph":
      return { imageUrl: "", title: "", body: "" } satisfies CampaignImageWithParagraphData;
    case "fullwidth_banner":
      return { imageUrl: "", title: "", ctaLabel: "", ctaHref: "" } satisfies CampaignFullwidthBannerData;
  }
}

interface Props {
  value: string;
  onChange: (json: string) => void;
}

export default function CampaignBlockBuilder({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<CampaignBlock[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const commit = useCallback((next: CampaignBlock[]) => {
    setBlocks(next);
    onChange(JSON.stringify(next));
  }, [onChange]);

  useEffect(() => {
    try {
      const raw = value ? JSON.parse(value) : [];
      const parsed = Array.isArray(raw) ? raw : [];
      if (JSON.stringify(parsed) !== JSON.stringify(blocks)) setBlocks(parsed);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const addBlock = (type: CampaignBlockType) => {
    const newBlock: CampaignBlock = { id: crypto.randomUUID(), type, data: getDefaultData(type) };
    commit([...blocks, newBlock]);
    setMenuOpen(false);
  };
  const updateBlock = (id: string, data: CampaignBlock["data"]) => {
    commit(blocks.map((b) => (b.id === id ? { ...b, data } : b)));
  };
  const deleteBlock = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const moveBlock = (index: number, dir: "up" | "down") => {
    const t = dir === "up" ? index - 1 : index + 1;
    if (t < 0 || t >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[t]] = [next[t], next[index]];
    commit(next);
  };
  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderEditor = (block: CampaignBlock) => {
    switch (block.type) {
      case "paragraph":
        return <ParagraphBlockEditor data={block.data as CampaignParagraphData} onChange={(d) => updateBlock(block.id, d)} />;
      case "image_text":
        return <ImageTextBlockEditor data={block.data as CampaignImageTextData} onChange={(d) => updateBlock(block.id, d)} />;
      case "three_images":
        return <ThreeImagesBlockEditor data={block.data as CampaignThreeImagesData} onChange={(d) => updateBlock(block.id, d)} />;
      case "single_image":
        return <SingleImageBlockEditor data={block.data as CampaignSingleImageData} onChange={(d) => updateBlock(block.id, d)} />;
      case "image_with_paragraph":
        return <ImageWithParagraphBlockEditor data={block.data as CampaignImageWithParagraphData} onChange={(d) => updateBlock(block.id, d)} />;
      case "fullwidth_banner":
        return <FullwidthBannerBlockEditor data={block.data as CampaignFullwidthBannerData} onChange={(d) => updateBlock(block.id, d)} />;
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const isCollapsed = collapsedIds.has(block.id);
        const menuItem = BLOCK_TYPE_MENU.find((m) => m.type === block.type);
        const IconComp = menuItem?.icon;
        return (
          <div key={block.id} className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-100 bg-warm-50/50">
              <GripVertical size={16} className="text-warm-400 flex-shrink-0" />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-100 text-warm-700 text-xs font-medium rounded-full">
                {IconComp && <IconComp size={12} />}
                {LABELS[block.type]}
              </span>
              <div className="flex-1" />
              <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30 transition-colors"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blocks.length - 1} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30 transition-colors"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => toggleCollapse(block.id)} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors">{isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
              <button type="button" onClick={() => deleteBlock(block.id)} className="p-1.5 rounded text-warm-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
            </div>
            {!isCollapsed && <div className="px-4 py-4">{renderEditor(block)}</div>}
          </div>
        );
      })}

      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((p) => !p)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 rounded-xl text-sm text-warm-500 hover:border-warm-400 hover:text-warm-700 hover:bg-warm-50 transition-colors">
          <Plus size={16} />
          Aggiungi sezione
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-warm-200 z-20 overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-warm-100">
              {BLOCK_TYPE_MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.type} type="button" onClick={() => addBlock(item.type)} className="flex flex-col items-center gap-1.5 px-3 py-4 bg-white text-warm-600 hover:bg-warm-50 hover:text-warm-800 transition-colors">
                    <Icon size={20} />
                    <span className="text-xs font-medium text-center">{item.label}</span>
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
