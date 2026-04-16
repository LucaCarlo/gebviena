"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Underline as UnderlineIcon, Link as LinkIcon, Unlink } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
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
    if (tag === "u") return `<u>${inner}</u>`;
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      const safe = /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : "";
      if (!safe || !inner) return inner;
      const isExternal = /^https?:/i.test(safe);
      const attrs = isExternal
        ? ` target="_blank" rel="noopener noreferrer"`
        : "";
      return `<a href="${safe.replace(/"/g, "&quot;")}"${attrs}>${inner}</a>`;
    }
    if (tag === "div" || tag === "p") return (inner ? inner + "<br>" : "");
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

export default function RichTextField({ value, onChange, placeholder, multiline = false, minHeight = 40 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [linkActive, setLinkActive] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const apply = (cmd: "bold" | "underline") => {
    ref.current?.focus();
    document.execCommand(cmd);
    if (ref.current) onChange(sanitize(ref.current.innerHTML));
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
        // Nessun testo selezionato: inserisci il link con l'URL come testo
        document.execCommand("insertHTML", false, `<a href="${trimmed}">${trimmed}</a>`);
      } else {
        document.execCommand("createLink", false, trimmed);
      }
    }
    onChange(sanitize(ref.current.innerHTML));
    refreshLinkState();
  };

  const removeLink = () => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand("unlink");
    onChange(sanitize(ref.current.innerHTML));
    refreshLinkState();
  };

  return (
    <div className="border border-warm-300 rounded focus-within:border-warm-800 focus-within:ring-1 focus-within:ring-warm-800">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-warm-200 bg-warm-50/60">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); apply("bold"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Grassetto (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); apply("underline"); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Sottolineato (Ctrl+U)"
        >
          <UnderlineIcon size={14} />
        </button>
        <div className="w-px h-4 bg-warm-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
          className={`p-1.5 rounded transition-colors ${
            linkActive
              ? "bg-warm-800 text-white"
              : "text-warm-600 hover:bg-warm-200 hover:text-warm-900"
          }`}
          title="Inserisci/modifica link"
        >
          <LinkIcon size={14} />
        </button>
        {linkActive && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); removeLink(); }}
            className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
            title="Rimuovi link"
          >
            <Unlink size={14} />
          </button>
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
        onInput={() => {
          if (ref.current) onChange(sanitize(ref.current.innerHTML));
          refreshLinkState();
        }}
        onKeyUp={refreshLinkState}
        onMouseUp={refreshLinkState}
        onFocus={refreshLinkState}
        onBlur={() => setLinkActive(false)}
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") e.preventDefault();
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            apply("bold");
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
            e.preventDefault();
            apply("underline");
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            insertLink();
          }
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
