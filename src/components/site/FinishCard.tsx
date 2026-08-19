"use client";

import { useState } from "react";
import { X } from "lucide-react";

// ============================================================================
// FinishCard — card informativa "FINISHES" in overlay sull'immagine prodotto.
//
// Comportamento (post-fix):
//  - Pulsante "i" in basso a sinistra: identico al legacy (pallino piccolo,
//    "i" font-serif). SEMPRE visibile quando c'e' almeno una parte compilata.
//  - Click sull'i: apre la card SOPRA il pulsante (non lo copre). Il pulsante
//    resta cliccabile per riaprire/chiudere; c'e' anche una X in alto a destra.
//  - Se `values` e' vuoto / tutte le parti blank: NON renderizza nulla.
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
  /** Titolo card (default "FINISHES"). */
  title?: string;
  /** Se passato, la card e' controllata dall'esterno (una sola aperta alla
   *  volta nel carousel). Se undefined, usa state interno (retro-compat). */
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
      {/* Pulsante info (stile legacy: pallino piccolo con "i" font-serif).
          Sempre visibile quando c'e' una didascalia. Click apre/chiude la card. */}
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

      {/* Card FINISHES sopra il pulsante (non lo copre). bottom-14 = 56px,
          il pulsante e' bottom-4 (16px) + h-7 (28px) = arriva a 44px; la card
          parte da 56px = 12px di gap sopra. */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 left-4 z-20 max-w-[280px] max-md:max-w-[calc(100%-32px)] bg-white shadow-lg rounded-sm overflow-hidden"
        >
          {/* Header con titolo + X */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-[0.15em]">
              {title}
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="text-warm-400 hover:text-warm-800 transition-colors"
              aria-label="Chiudi"
            >
              <X size={14} />
            </button>
          </div>

          {/* Sezioni parti compilate */}
          <div className="px-4 pb-4 space-y-3">
            {filledParts.map((part) => {
              const partVals = values[part.key] || {};
              return (
                <div key={part.key}>
                  <p className="text-[13px] font-semibold text-warm-900 mb-0.5">
                    {part.label}
                  </p>
                  <div className="text-[12px] leading-[1.35] text-warm-700">
                    {part.attributes.map((attr) => {
                      const v = (partVals[attr.key] || "").trim();
                      if (!v) return null;
                      return (
                        <div key={attr.key}>
                          <span className="font-semibold">{attr.label}:</span> {v}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
