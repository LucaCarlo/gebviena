"use client";

import RichTextEditor from "@/components/admin/RichTextEditor";
import { TextBlockData } from "@/types";

interface TextBlockEditorProps {
  data: TextBlockData;
  onChange: (data: TextBlockData) => void;
}

export default function TextBlockEditor({ data, onChange }: TextBlockEditorProps) {
  return (
    <div className="space-y-4">
      {/* Optional title */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
          Titolo (opzionale)
        </label>
        <input
          type="text"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          placeholder="Titolo della sezione..."
          className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
        />
      </div>

      {/* Body (rich text) */}
      <RichTextEditor
        label="Contenuto"
        value={data.body}
        onChange={(html) => onChange({ ...data, body: html })}
      />
    </div>
  );
}
