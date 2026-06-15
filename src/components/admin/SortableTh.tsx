"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

interface Props {
  /** Identificatore univoco della colonna (es. "name", "email", "createdAt"). */
  field: string;
  /** Field attualmente attivo (controlled). */
  sortField: string | null;
  /** Direzione attiva. */
  sortDir: SortDir;
  /** Callback al click: invertire dir se è la stessa colonna, altrimenti default asc. */
  onSort: (field: string, dir: SortDir) => void;
  children: React.ReactNode;
  className?: string;
  /** Mostra/nasconde l'indicatore freccia anche quando non attivo (default: true) */
  showInactiveIcon?: boolean;
  align?: "left" | "right" | "center";
}

/**
 * <th> ordinabile usato nelle 3 tabelle Persone (Clienti/Utenti/Pro). Click
 * sulla colonna: se non era attiva → la attiva con direzione "asc". Se era
 * già attiva → inverte direzione. Mostra freccia ↑/↓ accanto al label;
 * colonne non attive mostrano un'icona neutra molto tenue (sparisce su hover).
 */
export default function SortableTh({
  field, sortField, sortDir, onSort, children, className = "",
  showInactiveIcon = true, align = "left",
}: Props) {
  const active = sortField === field;
  const next: SortDir = active && sortDir === "asc" ? "desc" : "asc";
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <th className={`px-4 py-4 text-${align} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field, next)}
        className={`inline-flex items-center gap-1 ${justify} text-xs font-semibold tracking-tight transition-colors ${
          active ? "text-warm-900" : "text-warm-600 hover:text-warm-900"
        }`}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />
        ) : showInactiveIcon ? (
          <ArrowUpDown size={11} className="opacity-30" />
        ) : null}
      </button>
    </th>
  );
}
