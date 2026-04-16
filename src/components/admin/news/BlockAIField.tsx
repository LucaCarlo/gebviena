"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useTranslationCtx } from "@/contexts/TranslationContext";
import RichTextField from "../RichTextField";

async function aiTranslate(text: string, fromLang: string, toLang: string, htmlMode: boolean): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const res = await fetch("/api/admin/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, fromLang, toLang, htmlMode }),
    });
    const data = await res.json();
    return data.success ? (data.translation as string) : null;
  } catch {
    return null;
  }
}

function AIBtn({ sourceText, htmlMode, onTranslated }: { sourceText: string; htmlMode?: boolean; onTranslated: (v: string) => void }) {
  const ctx = useTranslationCtx();
  const [busy, setBusy] = useState(false);
  if (!ctx || !ctx.isTranslating) return null;
  const disabled = busy || !sourceText.trim();
  const handle = async () => {
    setBusy(true);
    try {
      const tr = await aiTranslate(sourceText, ctx.defaultLang, ctx.lang, !!htmlMode);
      if (tr !== null) onTranslated(tr);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      title={sourceText.trim() ? `Traduci da ${ctx.defaultLang.toUpperCase()} a ${ctx.lang.toUpperCase()} con AI` : "Sorgente vuota"}
      className="absolute right-2 top-2 z-10 flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded disabled:opacity-40"
    >
      {busy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      AI
    </button>
  );
}

interface BlockTextInputProps {
  value: string;
  onChange: (v: string) => void;
  sourceText?: string;
  className?: string;
  placeholder?: string;
}

export function BlockTextInput({ value, onChange, sourceText = "", className, placeholder }: BlockTextInputProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
      <AIBtn sourceText={sourceText} onTranslated={onChange} />
    </div>
  );
}

interface BlockRichTextProps {
  value: string;
  onChange: (v: string) => void;
  sourceText?: string;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
}

export function BlockRichText({ value, onChange, sourceText = "", placeholder, multiline, minHeight }: BlockRichTextProps) {
  return (
    <div className="relative">
      <RichTextField value={value} onChange={onChange} placeholder={placeholder} multiline={multiline} minHeight={minHeight} />
      <AIBtn sourceText={sourceText} onTranslated={onChange} htmlMode />
    </div>
  );
}
