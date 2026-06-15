"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Paginazione numerica stile classico: « ‹ 1 … N › »
 * Mostra fino a 7 pulsanti pagina (1, 2, …, ultima) con i puntini quando serve.
 */
export default function TablePagination({ page, pageSize, totalCount, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // Lista pagine da mostrare (es. 1, 2, 3, …, 10)
  const pagesToShow = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
    if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((n) => set.add(n));
    const arr = Array.from(set).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const withGaps: (number | "…")[] = [];
    arr.forEach((n, i) => {
      if (i > 0 && n - arr[i - 1] > 1) withGaps.push("…");
      withGaps.push(n);
    });
    return withGaps;
  })();

  const go = (n: number) => {
    if (n < 1 || n > totalPages || n === page) return;
    onPageChange(n);
  };

  return (
    <div className="flex items-center justify-between gap-3 pt-4 flex-wrap">
      <div className="text-xs text-warm-500">
        {from}–{to} di <strong>{totalCount}</strong>
      </div>
      <div className="flex items-center gap-1">
        <PageBtn aria="Prima" onClick={() => go(1)} disabled={page === 1}><ChevronsLeft size={14} /></PageBtn>
        <PageBtn aria="Precedente" onClick={() => go(page - 1)} disabled={page === 1}><ChevronLeft size={14} /></PageBtn>
        {pagesToShow.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-warm-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={`min-w-[32px] h-8 px-2 text-sm rounded border transition-colors ${
                p === page
                  ? "border-warm-900 bg-warm-900 text-white font-medium"
                  : "border-warm-200 text-warm-700 hover:bg-warm-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <PageBtn aria="Successiva" onClick={() => go(page + 1)} disabled={page === totalPages}><ChevronRight size={14} /></PageBtn>
        <PageBtn aria="Ultima" onClick={() => go(totalPages)} disabled={page === totalPages}><ChevronsRight size={14} /></PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ children, onClick, disabled, aria }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; aria: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      title={aria}
      className="w-8 h-8 flex items-center justify-center rounded border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
