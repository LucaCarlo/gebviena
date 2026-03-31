"use client";

import { useState } from "react";
import {
  Trash2, ChevronUp, ChevronDown, Plus,
  Image, Type, AlignLeft, MousePointer, Minus, Space,
  Bold, Italic, Link, List,
} from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

/* ───── Block Types ───── */

export type BlockType = "banner" | "title" | "text" | "button" | "divider" | "spacer";

export interface EmailBlock {
  id: string;
  type: BlockType;
  [key: string]: unknown;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: typeof Image; desc: string }[] = [
  { type: "banner", label: "Immagine", icon: Image, desc: "Banner o foto" },
  { type: "title", label: "Titolo", icon: Type, desc: "Intestazione grande" },
  { type: "text", label: "Testo", icon: AlignLeft, desc: "Paragrafo con formattazione" },
  { type: "button", label: "Pulsante", icon: MousePointer, desc: "Call to action" },
  { type: "divider", label: "Separatore", icon: Minus, desc: "Linea orizzontale" },
  { type: "spacer", label: "Spazio", icon: Space, desc: "Spazio vuoto" },
];

const VARIABLES = [
  { key: "{{firstName}}", label: "Nome" },
  { key: "{{lastName}}", label: "Cognome" },
  { key: "{{email}}", label: "Email" },
  { key: "{{eventLink}}", label: "Link evento" },
];

const GOOGLE_FONTS = [
  "Arial", "Georgia", "Helvetica", "Times New Roman", "Verdana",
  "Playfair Display", "Montserrat", "Open Sans", "Lato", "Roboto",
  "Libre Caslon Text", "Cormorant Garamond", "Poppins", "Inter", "Raleway",
];

let blockCounter = 0;
function newId() { return `blk_${++blockCounter}_${Date.now()}`; }

/* ───── Variable Chips ───── */

function VariableChips({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap mt-1.5">
      {VARIABLES.map((v) => (
        <button key={v.key} onClick={() => onInsert(v.key)} type="button"
          className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors font-mono">
          {v.label}
        </button>
      ))}
    </div>
  );
}

/* ───── Simple Rich Text (with bold, italic, link via HTML) ───── */

function RichTextArea({ value, onChange, rows = 5 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const [selStart, setSelStart] = useState(0);
  const [selEnd, setSelEnd] = useState(0);

  const wrapSelection = (tag: string) => {
    const before = value.slice(0, selStart);
    const selected = value.slice(selStart, selEnd);
    const after = value.slice(selEnd);
    if (!selected) return;
    onChange(`${before}<${tag}>${selected}</${tag}>${after}`);
  };

  const insertLink = () => {
    const url = prompt("Inserisci URL:");
    if (!url) return;
    const text = value.slice(selStart, selEnd) || "Clicca qui";
    const before = value.slice(0, selStart);
    const after = value.slice(selEnd);
    onChange(`${before}<a href="${url}">${text}</a>${after}`);
  };

  const insertList = () => {
    const before = value.slice(0, selStart);
    const after = value.slice(selEnd);
    onChange(`${before}\n• Elemento 1\n• Elemento 2\n• Elemento 3${after}`);
  };

  return (
    <div>
      <div className="flex gap-0.5 mb-1 border border-warm-300 rounded-t-lg bg-warm-50 px-2 py-1">
        <button type="button" onClick={() => wrapSelection("b")} className="p-1.5 text-warm-500 hover:text-warm-800 hover:bg-warm-200 rounded transition-colors" title="Grassetto"><Bold size={14} /></button>
        <button type="button" onClick={() => wrapSelection("i")} className="p-1.5 text-warm-500 hover:text-warm-800 hover:bg-warm-200 rounded transition-colors" title="Corsivo"><Italic size={14} /></button>
        <button type="button" onClick={insertLink} className="p-1.5 text-warm-500 hover:text-warm-800 hover:bg-warm-200 rounded transition-colors" title="Link"><Link size={14} /></button>
        <button type="button" onClick={insertList} className="p-1.5 text-warm-500 hover:text-warm-800 hover:bg-warm-200 rounded transition-colors" title="Lista"><List size={14} /></button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => { const t = e.target as HTMLTextAreaElement; setSelStart(t.selectionStart); setSelEnd(t.selectionEnd); }}
        rows={rows}
        className="w-full border border-warm-300 border-t-0 rounded-b-lg px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
        placeholder="Scrivi il testo qui... Puoi usare i bottoni sopra per formattare."
      />
    </div>
  );
}

/* ───── Single Block Editor ───── */

function BlockEditor({ block, idx, total, onUpdate, onRemove, onMove }: {
  block: EmailBlock;
  idx: number;
  total: number;
  onUpdate: (updates: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const typeLabel = BLOCK_TYPES.find((b) => b.type === block.type)?.label || block.type;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
      {/* Block header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-warm-50 border-b border-warm-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-warm-400 uppercase tracking-wider">{typeLabel}</span>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="p-1.5 text-warm-400 hover:text-warm-600 disabled:opacity-20 rounded transition-colors"><ChevronUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} className="p-1.5 text-warm-400 hover:text-warm-600 disabled:opacity-20 rounded transition-colors"><ChevronDown size={14} /></button>
          <button onClick={onRemove} className="p-1.5 text-warm-400 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Block content */}
      <div className="p-4">
        {block.type === "banner" && (
          <ImageUploadField
            label="Immagine"
            value={(block.imageUrl as string) || ""}
            onChange={(url) => onUpdate({ imageUrl: url })}
            onRemove={() => onUpdate({ imageUrl: "" })}
            purpose="general"
            folder="email-templates"
            recommendedSize="600x300px"
            helpText="Larghezza consigliata 600px per email"
          />
        )}

        {block.type === "title" && (
          <div className="space-y-3">
            <input type="text" value={(block.text as string) || ""} onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Scrivi il titolo..."
              className="w-full border border-warm-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-warm-800 focus:outline-none" />
            <div className="flex flex-wrap gap-3 items-center">
              <select value={(block.align as string) || "center"} onChange={(e) => onUpdate({ align: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
              </select>
              <select value={(block.fontFamily as string) || "Georgia"} onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                {GOOGLE_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-warm-500">Colore</label>
                <input type="color" value={(block.color as string) || "#1a1a1a"} onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-8 h-8 rounded border border-warm-300 cursor-pointer" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-warm-500">Grandezza</label>
                <select value={(block.fontSize as string) || "24"} onChange={(e) => onUpdate({ fontSize: e.target.value })}
                  className="border border-warm-300 rounded-lg px-2 py-2 text-xs focus:outline-none">
                  {["16", "18", "20", "22", "24", "28", "32", "36", "40"].map((s) => <option key={s} value={s}>{s}px</option>)}
                </select>
              </div>
            </div>
            <VariableChips onInsert={(v) => onUpdate({ text: ((block.text as string) || "") + v })} />
          </div>
        )}

        {block.type === "text" && (
          <div className="space-y-3">
            <RichTextArea value={(block.content as string) || ""} onChange={(v) => onUpdate({ content: v })} />
            <div className="flex flex-wrap gap-3 items-center">
              <select value={(block.align as string) || "left"} onChange={(e) => onUpdate({ align: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
              </select>
              <select value={(block.fontFamily as string) || "Arial"} onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                {GOOGLE_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-warm-500">Colore</label>
                <input type="color" value={(block.textColor as string) || "#444444"} onChange={(e) => onUpdate({ textColor: e.target.value })}
                  className="w-8 h-8 rounded border border-warm-300 cursor-pointer" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-warm-500">Sfondo</label>
                <input type="color" value={(block.bgColor as string) || "#ffffff"} onChange={(e) => onUpdate({ bgColor: e.target.value })}
                  className="w-8 h-8 rounded border border-warm-300 cursor-pointer" />
              </div>
            </div>
            <VariableChips onInsert={(v) => onUpdate({ content: ((block.content as string) || "") + v })} />
          </div>
        )}

        {block.type === "button" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">Testo pulsante</label>
                <input type="text" value={(block.text as string) || ""} onChange={(e) => onUpdate({ text: e.target.value })}
                  placeholder="Es. Registrati ora" className="w-full border border-warm-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-warm-500 uppercase mb-1">
                  URL destinazione
                  <button type="button" onClick={() => onUpdate({ url: "{{eventLink}}" })}
                    className="ml-2 text-purple-500 font-mono normal-case hover:text-purple-700">+ eventLink</button>
                </label>
                <input type="text" value={(block.url as string) || ""} onChange={(e) => onUpdate({ url: e.target.value })}
                  placeholder="https://..." className="w-full border border-warm-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <select value={(block.align as string) || "center"} onChange={(e) => onUpdate({ align: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option>
              </select>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-warm-500">Colore</label>
                <input type="color" value={(block.color as string) || "#3a5a6a"} onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-8 h-8 rounded border border-warm-300 cursor-pointer" />
              </div>
              <select value={(block.borderRadius as string) || "6"} onChange={(e) => onUpdate({ borderRadius: e.target.value })}
                className="border border-warm-300 rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="0">Quadrato</option><option value="6">Arrotondato</option><option value="24">Pillola</option>
              </select>
            </div>
            {/* Button preview */}
            <div className="pt-2" style={{ textAlign: (block.align as "left"|"center"|"right") || "center" }}>
              <span className="inline-block text-white text-sm font-semibold px-6 py-2.5" style={{
                backgroundColor: (block.color as string) || "#3a5a6a",
                borderRadius: `${(block.borderRadius as string) || "6"}px`,
              }}>
                {(block.text as string) || "Pulsante"}
              </span>
            </div>
          </div>
        )}

        {block.type === "divider" && (
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-warm-300" />
            <span className="text-[10px] text-warm-400">Separatore</span>
            <div className="flex-1 border-t border-warm-300" />
          </div>
        )}

        {block.type === "spacer" && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-warm-500">Altezza</label>
            <input type="range" min="10" max="80" value={(block.height as number) || 20}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
              className="flex-1" />
            <span className="text-xs text-warm-600 w-10 text-right">{(block.height as number) || 20}px</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Main Block List Editor ───── */

export default function EmailBlockEditor({ blocks, onChange }: {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addBlock = (type: BlockType) => {
    const base: EmailBlock = { id: newId(), type };
    switch (type) {
      case "banner": Object.assign(base, { imageUrl: "" }); break;
      case "title": Object.assign(base, { text: "", align: "center", color: "#1a1a1a", fontFamily: "Georgia", fontSize: "24" }); break;
      case "text": Object.assign(base, { content: "", align: "left", fontFamily: "Arial", textColor: "#444444", bgColor: "#ffffff" }); break;
      case "button": Object.assign(base, { text: "Scopri di più", url: "", color: "#3a5a6a", align: "center", borderRadius: "6" }); break;
      case "divider": break;
      case "spacer": Object.assign(base, { height: 20 }); break;
    }
    onChange([...blocks, base]);
    setShowAddMenu(false);
  };

  const updateBlock = (idx: number, updates: Partial<EmailBlock>) => {
    onChange(blocks.map((b, i) => i === idx ? { ...b, ...updates } : b));
  };

  const removeBlock = (idx: number) => onChange(blocks.filter((_, i) => i !== idx));

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        {blocks.map((block, idx) => (
          <BlockEditor
            key={block.id}
            block={block}
            idx={idx}
            total={blocks.length}
            onUpdate={(u) => updateBlock(idx, u)}
            onRemove={() => removeBlock(idx)}
            onMove={(d) => moveBlock(idx, d)}
          />
        ))}
      </div>

      {/* Add block */}
      <div className="relative">
        <button onClick={() => setShowAddMenu(!showAddMenu)} type="button"
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-warm-300 rounded-xl py-5 text-sm font-medium text-warm-500 hover:border-warm-400 hover:text-warm-600 transition-colors">
          <Plus size={18} /> Aggiungi blocco
        </button>
        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-warm-200 p-3 z-20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)} type="button"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-50 transition-colors text-left">
                    <div className="w-9 h-9 rounded-lg bg-warm-100 flex items-center justify-center shrink-0">
                      <bt.icon size={16} className="text-warm-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-warm-800">{bt.label}</div>
                      <div className="text-[10px] text-warm-400">{bt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
