"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ============================================================================
// FinishCard v5 — refinements:
//  - righe divisorie orizzontali (sotto FINISHES + tra ogni sezione)
//  - larghezza FISSA 220px, mai variabile (testo va a capo con break-words)
//  - animazione di entrata (fade + slide dal basso)
//  - triangolino puntatore in basso a sx della card, allineato al pallino "i"
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
      {/* Pallino "i" (bottom-left dell'immagine): sempre visibile, toggle card */}
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

      <AnimatePresence>
        {open && (
          <motion.div
            key="card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-14 left-4 z-20 w-[220px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] rounded-[2px] font-sans"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Titolo FINISHES */}
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-warm-700 font-normal">
                {title}
              </p>
            </div>

            {/* Riga sotto FINISHES + sezioni con separatori tra loro */}
            <div className="border-t border-warm-200 divide-y divide-warm-200">
              {filledParts.map((part) => {
                const partVals = values[part.key] || {};
                return (
                  <div key={part.key} className="px-5 py-4">
                    <p className="text-[13px] font-bold text-warm-900 mb-1 leading-tight break-words">
                      {part.label}
                    </p>
                    <div className="text-[12px] leading-[1.45] text-warm-900 break-words">
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

            {/* Triangolino puntatore verso il pallino "i" sotto.
                Il pallino ha centro a left-4 + 14px = 30px dall'immagine.
                La card parte a left-4 = 16px, quindi il centro del pallino
                cade a 14px dal bordo left della card. Il rombo w-3 (12px)
                centrato a 14px richiede left = 14 - 6 = 8px = left-2.
                -bottom-1.5 (=-6px) fa sporgere il rombo di 6px sotto la card. */}
            <div className="absolute -bottom-1.5 left-2 w-3 h-3 bg-white rotate-45 shadow-[2px_2px_2px_rgba(0,0,0,0.04)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
