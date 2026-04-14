"use client";

import { useTranslationCtx } from "@/contexts/TranslationContext";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import RichTextEditor from "./RichTextEditor";

interface BaseProps {
  fieldKey: string;
  defaultValue: string;
  onDefaultChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  htmlMode?: boolean;
}

function AIBtn({ fieldKey, htmlMode }: { fieldKey: string; htmlMode?: boolean }) {
  const ctx = useTranslationCtx();
  const [busy, setBusy] = useState(false);
  if (!ctx || !ctx.isTranslating) return null;
  const handle = async () => {
    setBusy(true);
    try {
      await ctx.translateField(fieldKey, htmlMode);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      title="Traduci dall'italiano con AI"
      className="absolute right-2 top-2 flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded disabled:opacity-50"
    >
      {busy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
      AI
    </button>
  );
}

export function TInput({ fieldKey, defaultValue, onDefaultChange, className, placeholder, type = "text" }: BaseProps & { type?: string }) {
  const ctx = useTranslationCtx();
  const value = ctx ? ctx.getValue(fieldKey, defaultValue) : defaultValue;
  const onChange = (v: string) => {
    if (ctx) ctx.setValue(fieldKey, v, onDefaultChange);
    else onDefaultChange(v);
  };
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
      <AIBtn fieldKey={fieldKey} />
    </div>
  );
}

export function TTextarea({ fieldKey, defaultValue, onDefaultChange, className, placeholder, rows = 3 }: BaseProps & { rows?: number }) {
  const ctx = useTranslationCtx();
  const value = ctx ? ctx.getValue(fieldKey, defaultValue) : defaultValue;
  const onChange = (v: string) => {
    if (ctx) ctx.setValue(fieldKey, v, onDefaultChange);
    else onDefaultChange(v);
  };
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={className}
        placeholder={placeholder}
      />
      <AIBtn fieldKey={fieldKey} />
    </div>
  );
}

export function TRichText({ fieldKey, defaultValue, onDefaultChange }: BaseProps) {
  const ctx = useTranslationCtx();
  const value = ctx ? ctx.getValue(fieldKey, defaultValue) : defaultValue;
  const onChange = (v: string) => {
    if (ctx) ctx.setValue(fieldKey, v, onDefaultChange);
    else onDefaultChange(v);
  };
  return (
    <div className="relative">
      <RichTextEditor value={value} onChange={onChange} />
      <AIBtn fieldKey={fieldKey} htmlMode />
    </div>
  );
}
