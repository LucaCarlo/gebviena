"use client";

import { useState } from "react";

// ============================================================================
// FinishCard v4 — pixel-match del mockup cliente:
//  - card bianca 220px, angoli minimalmente arrotondati (2px), ombra tenue
//  - padding interno 20px (p-5)
//  - "FINISHES" small-caps, tracking largo, colore grigio scuro, mb 16px
//  - Nome parte: sans-serif bold 13px, colore quasi nero
//  - Attributi: sans-serif 12px, label grassetto + valore regular
//  - Spacing verticale tra sezioni: 14-16px (space-y-4)
//  - Nessuna X: si chiude con click di nuovo sul pallino "i"
// ============================================================================

export interface CaptionAttribute {
  key: string;
  label: string;
}

export interface CaptionPart {
  key: string;
  label: string;
  attributes: CaptionAttribute[];
}

export interface CaptionSchema {
  key: string;
  label: string;
  parts: CaptionPart[];
}

export type CaptionValues = Record<string, Record<string, string>>;

export interface FinishCardProps {
  schema: CaptionSchema | null;
  values: CaptionValues | null | undefined;
  title?: string;
  open?: boolean;
  onToggle?: (next: boolean) => void;
}

function partHasValues(part: CaptionPart, values: CaptionValues): boolean {
  const partVals = values[part.key];
  if (!partVals) return false;
  return part.attributes.some((a) => (partVals[a.key] || "").trim().length > 0);
}

export default function FinishCard({ schema, values, title = "FINISHES", open: controlledOpen, onToggle }: FinishCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (onToggle) onToggle(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  if (!schema || !values) return null;
  const filledParts = schema.parts.filter((p) => partHasValues(p, values));
  if (filledParts.length === 0) return null;

  return (
    <>
      {/* Pulsante "i": pallino bianco piccolo, sempre visibile quando c'e'
          didascalia. Click toggle apri/chiudi. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        aria-label="Info finiture"
        className="absolute bottom-4 left-4 z-20 w-7 h-7 rounded-full bg-white text-warm-900 text-xs font-serif flex items-center justify-center shadow-sm cursor-pointer hover:bg-warm-100"
      >
        i
      </button>

      {/* Card sopra il pallino (12px di gap). Stile del mockup:
          bianco puro, ombra tenue, angoli 2px. Font sans di sistema (quello
          gia' impostato dal layout globale come font-body). */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 left-4 z-20 w-[220px] max-md:w-[calc(100%-32px)] max-md:max-w-[220px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-[2px] font-sans"
        >
          <div className="px-5 pt-5 pb-5">
            {/* Titolo FINISHES */}
            <p className="text-[11px] uppercase tracking-[0.18em] text-warm-700 font-normal mb-4">
              {title}
            </p>

            {/* Sezioni parti */}
            <div className="space-y-4">
              {filledParts.map((part) => {
                const partVals = values[part.key] || {};
                return (
                  <div key={part.key}>
                    <p className="text-[13px] font-bold text-warm-900 mb-1 leading-tight">
                      {part.label}
                    </p>
                    <div className="text-[12px] leading-[1.45] text-warm-900">
                      {part.attributes.map((attr) => {
                        const v = (partVals[attr.key] || "").trim();
                        if (!v) return null;
                        return (
                          <div key={attr.key}>
                            <span className="font-bold">{attr.label}:</span> {v}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
