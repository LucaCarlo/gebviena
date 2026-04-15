"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Plus,
  Type, LayoutTemplate, Grid3x3, Image as ImageIcon, Share2, BookOpen,
} from "lucide-react";
import type {
  NewsBlockV2, NewsBlockV2Type,
  NewsParagraphData, NewsImageTextBgData, NewsThreeImagesData, NewsSingleImageData,
} from "@/types";
import {
  ParagraphEditor, ImageTextBgEditor, ThreeImagesEditor, SingleImageEditor, ShareInfo, RelatedInfo,
} from "./NewsBlockEditors";

const MENU: { type: NewsBlockV2Type; icon: React.ElementType; label: string }[] = [
  { type: "image_text_bg", icon: LayoutTemplate, label: "Immagine + Testo (sfondo)" },
  { type: "three_images", icon: Grid3x3, label: "Tre immagini" },
  { type: "single_image", icon: ImageIcon, label: "Immagine singola" },
  { type: "paragraph", icon: Type, label: "Paragrafo" },
  { type: "share", icon: Share2, label: "Condividi" },
  { type: "related", icon: BookOpen, label: "Continua a leggere" },
];
const LABELS: Record<NewsBlockV2Type, string> = Object.fromEntries(MENU.map((m) => [m.type, m.label])) as Record<NewsBlockV2Type, string>;

function defaultData(t: NewsBlockV2Type): NewsBlockV2["data"] {
  switch (t) {
    case "paragraph": return { title: "", body: "" } satisfies NewsParagraphData;
    case "image_text_bg": return { title: "", text: "", imageUrl: "", imagePosition: "left" } satisfies NewsImageTextBgData;
    case "three_images": return { images: [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }] } satisfies NewsThreeImagesData;
    case "single_image": return { imageUrl: "", caption: "" } satisfies NewsSingleImageData;
    case "share": return {};
    case "related": return {};
  }
}

interface Props { value: string; onChange: (json: string) => void; }

export default function NewsBlockBuilder({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<NewsBlockV2[]>(() => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const commit = useCallback((next: NewsBlockV2[]) => {
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
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const add = (t: NewsBlockV2Type) => { commit([...blocks, { id: crypto.randomUUID(), type: t, data: defaultData(t) }]); setMenuOpen(false); };
  const upd = (id: string, d: NewsBlockV2["data"]) => commit(blocks.map((b) => b.id === id ? { ...b, data: d } : b));
  const del = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const move = (i: number, dir: "up" | "down") => {
    const t = dir === "up" ? i - 1 : i + 1;
    if (t < 0 || t >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[t]] = [next[t], next[i]];
    commit(next);
  };
  const toggle = (id: string) => setCollapsed((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const render = (b: NewsBlockV2) => {
    switch (b.type) {
      case "paragraph": return <ParagraphEditor data={b.data as NewsParagraphData} onChange={(d) => upd(b.id, d)} />;
      case "image_text_bg": return <ImageTextBgEditor data={b.data as NewsImageTextBgData} onChange={(d) => upd(b.id, d)} />;
      case "three_images": return <ThreeImagesEditor data={b.data as NewsThreeImagesData} onChange={(d) => upd(b.id, d)} />;
      case "single_image": return <SingleImageEditor data={b.data as NewsSingleImageData} onChange={(d) => upd(b.id, d)} />;
      case "share": return <ShareInfo />;
      case "related": return <RelatedInfo />;
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        const isC = collapsed.has(b.id);
        const menuItem = MENU.find((m) => m.type === b.type);
        const Icon = menuItem?.icon;
        return (
          <div key={b.id} className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-100 bg-warm-50/50">
              <GripVertical size={16} className="text-warm-400 flex-shrink-0" />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-100 text-warm-700 text-xs font-medium rounded-full">
                {Icon && <Icon size={12} />}
                {LABELS[b.type]}
              </span>
              <div className="flex-1" />
              <button type="button" onClick={() => move(i, "up")} disabled={i === 0} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => move(i, "down")} disabled={i === blocks.length - 1} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => toggle(b.id)} className="p-1.5 rounded text-warm-400 hover:text-warm-700 hover:bg-warm-100">{isC ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
              <button type="button" onClick={() => del(b.id)} className="p-1.5 rounded text-warm-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
            </div>
            {!isC && <div className="px-4 py-4">{render(b)}</div>}
          </div>
        );
      })}

      <div className="relative" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((p) => !p)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 rounded-xl text-sm text-warm-500 hover:border-warm-400 hover:text-warm-700 hover:bg-warm-50">
          <Plus size={16} />Aggiungi sezione
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-warm-200 z-20 overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-warm-100">
              {MENU.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.type} type="button" onClick={() => add(m.type)} className="flex flex-col items-center gap-1.5 px-3 py-4 bg-white text-warm-600 hover:bg-warm-50 hover:text-warm-800">
                    <Icon size={20} />
                    <span className="text-xs font-medium text-center">{m.label}</span>
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
