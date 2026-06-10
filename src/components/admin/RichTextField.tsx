"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, Unlink, AlignLeft, AlignCenter, AlignRight, Type } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
}

// Stili inline whitelisted per text-align / font-family / font-weight.
// Tutto il resto viene strippato dal sanitize.
const ALLOWED_STYLE_KEYS = ["text-align", "font-family", "font-weight"] as const;

function pickStyles(el: HTMLElement): string {
  const out: string[] = [];
  for (const k of ALLOWED_STYLE_KEYS) {
    const v = el.style.getPropertyValue(k);
    if (v && v.trim()) out.push(`${k}: ${v.trim()}`);
  }
  return out.length ? ` style="${out.join("; ")}"` : "";
}

function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild as HTMLElement;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (tag === "strong" || tag === "b") return `<strong>${inner}</strong>`;
    if (tag === "em" || tag === "i") return `<em>${inner}</em>`;
    if (tag === "u") return `<u>${inner}</u>`;
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      const safe = /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : "";
      if (!safe || !inner) return inner;
      const isExternal = /^https?:/i.test(safe);
      const attrs = isExternal ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a href="${safe.replace(/"/g, "&quot;")}"${attrs}>${inner}</a>`;
    }
    if (tag === "span") {
      const styles = pickStyles(el);
      if (!styles) return inner;
      return `<span${styles}>${inner}</span>`;
    }
    if (tag === "div" || tag === "p") {
      const styles = pickStyles(el);
      // Se il blocco ha text-align (inline style) lo manteniamo come <div style="...">.
      if (styles.includes("text-align")) return `<div${styles}>${inner || "<br>"}</div>`;
      // Fallback: alcuni browser (Firefox storico) usano l'attributo align="...".
      const alignAttr = (el.getAttribute("align") || "").toLowerCase();
      if (alignAttr === "left" || alignAttr === "center" || alignAttr === "right") {
        return `<div style="text-align: ${alignAttr}">${inner || "<br>"}</div>`;
      }
      // Altrimenti, flatten standard: il contenuto + un break a fine blocco.
      return inner ? inner + "<br>" : "";
    }
    return inner;
  };
  return Array.from(root.childNodes).map(walk).join("").replace(/(<br>)+$/, "");
}

function getSelectionAnchor(root: HTMLElement): HTMLAnchorElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "A") {
      return node as HTMLAnchorElement;
    }
    node = node.parentNode;
  }
  return null;
}

// Wrappa un range specifico in <span style="..."> applicando le proprietà.
// Il range va passato esplicitamente perché aprire un dropdown nel toolbar
// fa perdere la selection del contenteditable; il chiamante deve salvarla
// in anticipo (saveRange) e passarla qui.
function wrapRangeWithStyle(root: HTMLElement, range: Range, styles: Record<string, string>): boolean {
  if (range.collapsed) return false;
  if (!root.contains(range.commonAncestorContainer)) return false;
  const span = document.createElement("span");
  for (const [k, v] of Object.entries(styles)) span.style.setProperty(k, v);
  try {
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const sel = window.getSelection();
    if (sel) {
      const r2 = document.createRange();
      r2.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(r2);
    }
    return true;
  } catch {
    return false;
  }
}

const FONT_OPTIONS: { label: string; family: string }[] = [
  { label: "Work Sans (sans-serif)", family: "var(--font-work-sans), 'Work Sans', sans-serif" },
  { label: "Libre Caslon Text (serif)", family: "var(--font-caslon), 'Libre Caslon Text', serif" },
];

const WEIGHT_OPTIONS: { label: string; weight: string }[] = [
  { label: "Light · 300", weight: "300" },
  { label: "Regular · 400", weight: "400" },
  { label: "Medium · 500", weight: "500" },
  { label: "SemiBold · 600", weight: "600" },
  { label: "Bold · 700", weight: "700" },
];

export default function RichTextField({ value, onChange, placeholder, multiline = false, minHeight = 40 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [linkActive, setLinkActive] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [weightMenuOpen, setWeightMenuOpen] = useState(false);
  // Snapshot del range della selezione: i dropdown Font/Peso tolgono il
  // focus al contenteditable → senza questo, il wrap si applicherebbe a
  // un range collassato (cursore senza selezione) e creerebbe uno span vuoto.
  const savedRangeRef = useRef<Range | null>(null);

  const saveRange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (ref.current && ref.current.contains(r.commonAncestorContainer)) {
      savedRangeRef.current = r.cloneRange();
    }
  };
  const restoreRange = (): Range | null => {
    const r = savedRangeRef.current;
    if (!r) return null;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(r);
    }
    return r;
  };

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  // Chiusura dei dropdown Font/Peso quando si clicca fuori
  useEffect(() => {
    if (!fontMenuOpen && !weightMenuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-rtf-menu]")) {
        setFontMenuOpen(false);
        setWeightMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [fontMenuOpen, weightMenuOpen]);

  const emit = () => {
    if (ref.current) onChange(sanitize(ref.current.innerHTML));
  };

  const apply = (cmd: "bold" | "italic" | "underline") => {
    ref.current?.focus();
    document.execCommand(cmd);
    emit();
  };

  const applyAlign = (align: "left" | "center" | "right") => {
    ref.current?.focus();
    document.execCommand(
      align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight",
    );
    emit();
  };

  const applyFont = (family: string) => {
    if (!ref.current) return;
    const range = restoreRange();
    if (!range || range.collapsed) {
      setFontMenuOpen(false);
      return; // nessuna selezione → niente da fare (evita span vuoti)
    }
    wrapRangeWithStyle(ref.current, range, { "font-family": family });
    emit();
    setFontMenuOpen(false);
  };

  const applyWeight = (weight: string) => {
    if (!ref.current) return;
    const range = restoreRange();
    if (!range || range.collapsed) {
      setWeightMenuOpen(false);
      return;
    }
    wrapRangeWithStyle(ref.current, range, { "font-weight": weight });
    emit();
    setWeightMenuOpen(false);
  };

  const refreshLinkState = () => {
    if (!ref.current) return;
    setLinkActive(!!getSelectionAnchor(ref.current));
  };

  const insertLink = () => {
    if (!ref.current) return;
    ref.current.focus();
    const existing = getSelectionAnchor(ref.current);
    const current = existing?.getAttribute("href") || "";
    const url = window.prompt("Inserisci URL (https://... o /percorso)", current || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      document.execCommand("unlink");
    } else {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        document.execCommand("insertHTML", false, `<a href="${trimmed}">${trimmed}</a>`);
      } else {
        document.execCommand("createLink", false, trimmed);
      }
    }
    emit();
    refreshLinkState();
  };

  const removeLink = () => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand("unlink");
    emit();
    refreshLinkState();
  };

  return (
    <div className="border border-warm-300 rounded focus-within:border-warm-800 focus-within:ring-1 focus-within:ring-warm-800">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-warm-200 bg-warm-50/60 flex-wrap">
        {/* Bold / Italic / Underline */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); apply("bold"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Grassetto (Ctrl+B)"><Bold size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); apply("italic"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Corsivo (Ctrl+I)"><Italic size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); apply("underline"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Sottolineato (Ctrl+U)"><UnderlineIcon size={14} /></button>

        <div className="w-px h-4 bg-warm-200 mx-1" />

        {/* Allineamento */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyAlign("left"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Allinea a sinistra"><AlignLeft size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyAlign("center"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Allinea al centro"><AlignCenter size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyAlign("right"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Allinea a destra"><AlignRight size={14} /></button>

        <div className="w-px h-4 bg-warm-200 mx-1" />

        {/* Font picker */}
        <div className="relative" data-rtf-menu>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveRange(); setFontMenuOpen((v) => !v); setWeightMenuOpen(false); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors text-[11px]"
            title="Font (seleziona prima del testo)">
            <Type size={12} /> Font
          </button>
          {fontMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-warm-300 rounded shadow-md min-w-[210px]">
              {FONT_OPTIONS.map((f) => (
                <button key={f.label} type="button" onMouseDown={(e) => { e.preventDefault(); applyFont(f.family); }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-warm-100"
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weight picker */}
        <div className="relative" data-rtf-menu>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveRange(); setWeightMenuOpen((v) => !v); setFontMenuOpen(false); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors text-[11px]"
            title="Peso (seleziona prima del testo)">
            Peso
          </button>
          {weightMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-warm-300 rounded shadow-md min-w-[160px]">
              {WEIGHT_OPTIONS.map((w) => (
                <button key={w.weight} type="button" onMouseDown={(e) => { e.preventDefault(); applyWeight(w.weight); }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-warm-100"
                  style={{ fontWeight: w.weight }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-warm-200 mx-1" />

        {/* Link */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
          className={`p-1.5 rounded transition-colors ${
            linkActive ? "bg-warm-800 text-white" : "text-warm-600 hover:bg-warm-200 hover:text-warm-900"
          }`}
          title="Inserisci/modifica link"><LinkIcon size={14} /></button>
        {linkActive && (
          <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink(); }}
            className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
            title="Rimuovi link"><Unlink size={14} /></button>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        data-placeholder={placeholder || ""}
        className="rich-text-editor px-4 py-2.5 text-sm outline-none whitespace-pre-wrap break-words"
        style={{ minHeight }}
        onInput={() => { emit(); refreshLinkState(); }}
        onKeyUp={refreshLinkState}
        onMouseUp={refreshLinkState}
        onFocus={refreshLinkState}
        onBlur={() => setLinkActive(false)}
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") e.preventDefault();
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); apply("bold"); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") { e.preventDefault(); apply("italic"); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") { e.preventDefault(); apply("underline"); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); insertLink(); }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, multiline ? text : text.replace(/\n/g, " "));
        }}
      />
      <style jsx>{`
        .rich-text-editor:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor :global(a) {
          color: #1d4ed8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
