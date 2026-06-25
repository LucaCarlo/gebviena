"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";

interface Catalog {
  id: string;
  name: string;
  section: string;
  title?: string | null;
  description?: string | null;
  imageUrl: string;
  pdfUrl: string;
  isActive: boolean;
}

interface Category {
  slug: string;
  label: string;
  sortOrder: number;
}

interface I18n {
  loading: string;
  empty: string;
  previewUnavailable: string;
  pdfUnavailable: string;
  downloadPdf: string;
  allLabel: string;
}

export default function CataloghiClient({ lang, i18n }: { lang?: string; i18n: I18n }) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("__all__");

  useEffect(() => {
    // Le API /api/* non passano dal middleware, quindi non ricevono
    // x-gtv-lang. Passiamo la lingua come query param così title/description
    // e label categoria tornano già tradotti.
    const langParam = lang && lang !== "it" ? `?lang=${encodeURIComponent(lang)}` : "";
    Promise.all([
      fetch(`/api/catalogs${langParam}`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/catalog-categories${langParam}`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([catRes, catgRes]) => {
      setCatalogs(((catRes.data || []) as Catalog[]).filter((c) => c.isActive));
      setCategories((catgRes.data || []) as Category[]);
    }).finally(() => setLoading(false));
  }, [lang]);

  const visibleCategories = useMemo(() => {
    const usedSlugs = new Set(catalogs.map((c) => c.section));
    return categories.filter((c) => usedSlugs.has(c.slug));
  }, [catalogs, categories]);

  if (loading) return <div className="py-20 text-center text-warm-400 text-sm">{i18n.loading}</div>;
  if (catalogs.length === 0) return <div className="py-20 text-center text-warm-400 text-sm">{i18n.empty}</div>;

  // Tutti i cataloghi (eventualmente filtrati) in un unico grid, senza
  // titoletti per sezione — il filtro pill in alto basta a navigare.
  const visibleCatalogs = filter === "__all__"
    ? catalogs
    : catalogs.filter((c) => c.section === filter);

  return (
    <div className="space-y-8">
      {/* Filtri pill */}
      {visibleCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill active={filter === "__all__"} onClick={() => setFilter("__all__")}>{i18n.allLabel}</FilterPill>
          {visibleCategories.map((c) => (
            <FilterPill key={c.slug} active={filter === c.slug} onClick={() => setFilter(c.slug)}>{c.label}</FilterPill>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {visibleCatalogs.map((c) => (
          <CatalogCard key={c.id} c={c} i18n={i18n} />
        ))}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full transition-colors ${
        active
          ? "bg-warm-900 text-white"
          : "bg-white text-warm-700 border border-warm-300 hover:bg-warm-100"
      }`}
    >
      {children}
    </button>
  );
}

function CatalogCard({ c, i18n }: { c: Catalog; i18n: I18n }) {
  const hasPdf = Boolean(c.pdfUrl && c.pdfUrl.trim());
  const Wrapper: React.ElementType = hasPdf ? "a" : "div";
  const wrapperProps = hasPdf
    ? { href: c.pdfUrl, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block bg-white border border-warm-200 transition-colors ${
        hasPdf ? "hover:border-warm-900" : "opacity-60 cursor-not-allowed"
      }`}
    >
      <div className="relative aspect-[3/4] bg-warm-100 overflow-hidden">
        {c.imageUrl ? (
          <Image
            src={c.imageUrl}
            alt={c.title || c.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-warm-400 text-xs">
            {i18n.previewUnavailable}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[12px] md:text-sm font-medium text-warm-900 leading-snug line-clamp-2 min-h-[2.6em]">
          {c.title || c.name}
        </div>
        {c.description && (
          <p className="text-[11px] text-warm-500 mt-1 line-clamp-2 leading-snug">{c.description}</p>
        )}
        <div className="mt-2 pt-2 border-t border-warm-100">
          {hasPdf ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-warm-900 group-hover:text-warm-700">
              <Download size={11} /> {i18n.downloadPdf}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.12em] text-warm-400">
              {i18n.pdfUnavailable}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
