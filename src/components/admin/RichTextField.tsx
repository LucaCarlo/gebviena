"use client";

import { useEffect, useRef } from "react";
import { Bold } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
}

function sanitize(html: string): string {
  // Keep only <strong>, <b>, <br>. Strip everything else but keep inner text.
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
    if (tag === "br") return "<br>";
    if (tag === "div" || tag === "p") return (inner ? inner + "<br>" : "");
    return inner;
  };
  return Array.from(root.childNodes).map(walk).join("").replace(/(<br>)+$/, "");
}

export default function RichTextField({ value, onChange, placeholder, multiline = false, minHeight = 40 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const toggleBold = () => {
    ref.current?.focus();
    document.execCommand("bold");
    if (ref.current) onChange(sanitize(ref.current.innerHTML));
  };

  return (
    <div className="border border-warm-300 rounded focus-within:border-warm-800 focus-within:ring-1 focus-within:ring-warm-800">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-warm-200 bg-warm-50/60">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleBold(); }}
          className="p-1.5 rounded text-warm-600 hover:bg-warm-200 hover:text-warm-900 transition-colors"
          title="Grassetto (Ctrl+B)"
        >
          <Bold size={14} />
        </button>
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
        }}
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") e.preventDefault();
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            toggleBold();
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
      `}</style>
    </div>
  );
}
