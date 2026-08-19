"use client";

import type { CaptionSchema, CaptionValues } from "@/components/site/FinishCard";

// ============================================================================
// CaptionEditor — form dinamico per compilare i valori di UNA didascalia
// FINISHES sulla base di uno schema (parti/attributi).
//
// Non gestisce visibilita' / accordion / lingua: sono responsabilita' del
// padre (ProductForm). Qui solo il rendering dei campi + onChange controllato.
// ============================================================================

export interface CaptionEditorProps {
  schema: CaptionSchema | null;
  values: CaptionValues | null | undefined;
  onChange: (next: CaptionValues) => void;
  /** Se true, mostra un placeholder invece del form quando manca lo schema. */
  showMissingSchemaHint?: boolean;
}

export default function CaptionEditor({ schema, values, onChange, showMissingSchemaHint = true }: CaptionEditorProps) {
  if (!schema) {
    if (!showMissingSchemaHint) return null;
    return (
      <p className="text-xs text-warm-500 italic">
        Seleziona una &quot;Struttura didascalia&quot; in cima al form per compilare i campi.
      </p>
    );
  }

  const setAttr = (partKey: string, attrKey: string, value: string) => {
    const next: CaptionValues = { ...(values || {}) };
    const partVals = { ...(next[partKey] || {}) };
    partVals[attrKey] = value;
    next[partKey] = partVals;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {schema.parts.map((part) => {
        const partVals = (values && values[part.key]) || {};
        return (
          <div key={part.key} className="border border-warm-200 rounded-lg p-3 bg-warm-50">
            <p className="text-xs font-semibold text-warm-800 uppercase tracking-wider mb-2">
              {part.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {part.attributes.map((attr) => (
                <div key={attr.key}>
                  <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wider mb-1">
                    {attr.label}
                  </label>
                  <input
                    type="text"
                    value={partVals[attr.key] || ""}
                    onChange={(e) => setAttr(part.key, attr.key, e.target.value)}
                    className="w-full border border-warm-300 rounded px-2 py-1.5 text-sm focus:border-warm-800 focus:outline-none bg-white"
                    placeholder={attr.label.toLowerCase()}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
