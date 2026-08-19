"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

// ============================================================================
// FinishCard — card informativa "FINISHES" in overlay sull'immagine prodotto.
//
// Legge `captionValues` (la mappa parts[key]→attrs[key]→value gia' risolta per
// la lingua corrente) e la mostra come una card in basso a sinistra sull'immagine.
// Chiusa di default: appare solo il pulsante info (i) in basso a sinistra.
// Al click sull'i, la card slide-up e mostra le sezioni compilate.
// Chiusa di nuovo al click sulla X o sul backdrop dell'immagine.
//
// Se `captionValues` e' vuota o tutti i valori sono blank, la card NON viene
// mostrata (nemmeno il pulsante info) — evita di sporcare le immagini che non
// hanno didascalia compilata.
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

// Valori compilati: { partKey → { attrKey → value } }
export type CaptionValues = Record<string, Record<string, string>>;

export interface FinishCardProps {
  schema: CaptionSchema | null;
  values: CaptionValues | null | undefined;
  /** Titolo della card (default "FINISHES"). Sara' traducibile da ui-strings in futuro. */
  title?: string;
  /** Se true, forza la card sempre visibile senza pulsante toggle. */
  alwaysOpen?: boolean;
}

/**
 * Determina se la parte ha almeno un valore compilato (per non renderizzare
 * sezioni vuote quando l'admin ha compilato solo una parte del form).
 */
function partHasValues(part: CaptionPart, values: CaptionValues): boolean {
  const partVals = values[part.key];
  if (!partVals) return false;
  return part.attributes.some((a) => (partVals[a.key] || "").trim().length > 0);
}

export default function FinishCard({ schema, values, title = "FINISHES", alwaysOpen = false }: FinishCardProps) {
  const [open, setOpen] = useState(alwaysOpen);

  if (!schema || !values) return null;

  // Filtra parti che hanno almeno un valore compilato
  const filledParts = schema.parts.filter((p) => partHasValues(p, values));
  if (filledParts.length === 0) return null;

  return (
    <>
      {/* Pulsante info in basso a sinistra dell'immagine.
          Nasconde/apre la card. Nascosto se la card e' alwaysOpen. */}
      {!alwaysOpen && !open && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="absolute bottom-4 left-4 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm text-warm-900 flex items-center justify-center shadow-md hover:bg-white transition-colors"
          aria-label="Mostra dettagli finiture"
        >
          <Info size={16} />
        </button>
      )}

      {/* Card. Slide-up quando open=true. Posizionata bottom-left, max ~280px larga
          su desktop / responsive su mobile. */}
      {(open || alwaysOpen) && (
        <div className="absolute bottom-4 left-4 z-20 max-w-[280px] max-md:max-w-[calc(100%-32px)] bg-white/95 backdrop-blur-sm shadow-lg rounded-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          {/* Header con titolo + X (solo se toggleable) */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-[0.15em]">
              {title}
            </p>
            {!alwaysOpen && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="text-warm-400 hover:text-warm-800 transition-colors"
                aria-label="Chiudi"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sezioni parti */}
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
