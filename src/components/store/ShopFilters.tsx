"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X, Search as SearchIcon } from "lucide-react";
import { useStoreT } from "@/lib/use-store-t";
import { useLang } from "@/contexts/I18nContext";

interface AttrValue {
  id: string;
  type:
    | "MATERIAL"
    | "FINISH"
    | "COLOR"
    | "STRUCTURE"
    | "SEAT"
    | "UPHOLSTERY"
    | "INSERT"
    | "CONFIGURATION"
    | "OTHER";
  code: string;
  hexColor: string | null;
  translations: { languageCode: string; label: string }[];
}

interface Category {
  id: string;
  parentId: string | null;
  slug: string;
  translations: { languageCode: string; name: string; slug: string }[];
}

const TYPE_LABEL: Record<AttrValue["type"], string> = {
  MATERIAL: "Materiale",
  FINISH: "Finitura",
  COLOR: "Colore",
  STRUCTURE: "Struttura",
  SEAT: "Seduta",
  UPHOLSTERY: "Imbottitura",
  INSERT: "Inserti",
  CONFIGURATION: "Variante",
  OTHER: "Altro",
};
const SHOP_FILTER_TYPES: AttrValue["type"][] = [
  "STRUCTURE", "SEAT", "COLOR", "MATERIAL", "FINISH",
  "UPHOLSTERY", "INSERT", "CONFIGURATION",
];

const TYPE_LABEL_FR: Record<AttrValue["type"], string> = {
  MATERIAL: "Matériau",
  FINISH: "Finition",
  COLOR: "Couleur",
  STRUCTURE: "Structure",
  SEAT: "Assise",
  UPHOLSTERY: "Rembourrage",
  INSERT: "Inserts",
  CONFIGURATION: "Variante",
  OTHER: "Autre",
};
const SORT_OPTIONS = [
  { value: "newest", label: "Novità", labelFr: "Nouveautés" },
  { value: "price-asc", label: "Prezzo: crescente", labelFr: "Prix : croissant" },
  { value: "price-desc", label: "Prezzo: decrescente", labelFr: "Prix : décroissant" },
  { value: "name", label: "Nome A-Z", labelFr: "Nom A-Z" },
];

export default function ShopFilters() {
  const router = useRouter();
  const search = useSearchParams();
  const tr = useStoreT();
  const lang = useLang();

  const [attrs, setAttrs] = useState<AttrValue[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    category: true, price: true, availability: true,
    STRUCTURE: true, SEAT: true, COLOR: true,
    MATERIAL: true, FINISH: true, UPHOLSTERY: true, INSERT: true, CONFIGURATION: true,
  });

  // Query state locale (per debouncing)
  const [qInput, setQInput] = useState(search.get("q") || "");
  const [minPriceInput, setMinPriceInput] = useState(search.get("minPrice") || "");
  const [maxPriceInput, setMaxPriceInput] = useState(search.get("maxPrice") || "");

  useEffect(() => {
    fetch("/api/store/public/attributes").then((r) => r.json()).then((d) => d.success && setAttrs(d.data));
    fetch("/api/store/public/categories").then((r) => r.json()).then((d) => d.success && setCats(d.data));
  }, []);

  useEffect(() => { setQInput(search.get("q") || ""); }, [search]);

  const selectedCategorySlug = search.get("category") || "";
  const selectedAttrs = useMemo(() => new Set((search.get("attrs") || "").split(",").filter(Boolean)), [search]);
  const onlyAvailable = search.get("onlyAvailable") === "1";
  const selectedSort = search.get("sort") || "newest";

  const updateQuery = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    // scroll: false — non riportare l'utente in cima quando cambia un filtro
    router.push(qs ? `/?${qs}` : "/", { scroll: false });
  };

  // Debounce ricerca testuale (400ms)
  useEffect(() => {
    const cur = search.get("q") || "";
    if (qInput === cur) return;
    const t = setTimeout(() => updateQuery({ q: qInput.trim() || null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const applyPrice = () => {
    const patch: Record<string, string | null> = {};
    patch.minPrice = minPriceInput ? String(Number(minPriceInput)) : null;
    patch.maxPrice = maxPriceInput ? String(Number(maxPriceInput)) : null;
    updateQuery(patch);
  };

  const toggleAttr = (id: string) => {
    const next = new Set(selectedAttrs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateQuery({ attrs: Array.from(next).join(",") || null });
  };

  const hasAnyFilter = selectedCategorySlug || selectedAttrs.size > 0 || qInput || minPriceInput || maxPriceInput || onlyAvailable;
  const toggleExpand = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));
  const byType = (t: AttrValue["type"]) => attrs.filter((a) => a.type === t);
  const label = (a: AttrValue) =>
    a.translations.find((x) => x.languageCode === lang)?.label
    || a.translations.find((x) => x.languageCode === "it")?.label
    || a.code;

  const resetAll = () => {
    setQInput(""); setMinPriceInput(""); setMaxPriceInput("");
    router.push("/", { scroll: false });
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Ricerca testuale */}
      <div className="relative">
        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={tr("Cerca un prodotto…", "Rechercher un produit…")}
          className="w-full pl-9 pr-8 py-2 border border-warm-200 bg-white text-sm focus:outline-none focus:border-warm-500"
        />
        {qInput && (
          <button onClick={() => setQInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-xs uppercase tracking-[0.15em] text-warm-500 shrink-0">{tr("Ordina", "Trier")}</label>
        <select
          value={selectedSort}
          onChange={(e) => updateQuery({ sort: e.target.value === "newest" ? null : e.target.value })}
          className="flex-1 border border-warm-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-warm-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{tr(o.label, o.labelFr)}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.2em] text-warm-500">{tr("Filtri", "Filtres")}</h2>
        {hasAnyFilter && (
          <button onClick={resetAll} className="text-xs text-warm-500 hover:text-warm-900 inline-flex items-center gap-1">
            <X size={11} /> {tr("Reset", "Réinitialiser")}
          </button>
        )}
      </div>

      {/* Categoria */}
      <FilterGroup label={tr("Categoria", "Catégorie")} open={expanded.category} onToggle={() => toggleExpand("category")}>
        <div className="space-y-1">
          <button
            onClick={() => updateQuery({ category: null })}
            className={`block w-full text-left py-1 ${!selectedCategorySlug ? "text-warm-900 font-medium" : "text-warm-600 hover:text-warm-900"}`}
          >
            {tr("Tutte", "Toutes")}
          </button>
          {cats.filter((c) => !c.parentId).map((c) => {
            const name = c.translations.find((t) => t.languageCode === lang)?.name
              || c.translations.find((t) => t.languageCode === "it")?.name
              || c.slug;
            const isSel = selectedCategorySlug === c.slug;
            return (
              <button
                key={c.id}
                onClick={() => updateQuery({ category: c.slug })}
                className={`block w-full text-left py-1 ${isSel ? "text-warm-900 font-medium" : "text-warm-600 hover:text-warm-900"}`}
              >
                {name}
              </button>
            );
          })}
          {cats.length === 0 && <div className="text-warm-400 italic text-xs">{tr("Nessuna categoria pubblicata.", "Aucune catégorie publiée.")}</div>}
        </div>
      </FilterGroup>

      {/* Prezzo */}
      <FilterGroup label={tr("Prezzo (€)", "Prix (€)")} open={expanded.price} onToggle={() => toggleExpand("price")}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === "Enter" && applyPrice()}
              className="w-full border border-warm-200 px-2 py-1 text-xs bg-white focus:outline-none focus:border-warm-500"
            />
            <span className="text-warm-400">–</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === "Enter" && applyPrice()}
              className="w-full border border-warm-200 px-2 py-1 text-xs bg-white focus:outline-none focus:border-warm-500"
            />
          </div>
          {(minPriceInput || maxPriceInput) && (
            <button
              onClick={() => { setMinPriceInput(""); setMaxPriceInput(""); updateQuery({ minPrice: null, maxPrice: null }); }}
              className="text-[11px] text-warm-500 hover:text-warm-900"
            >
              {tr("Rimuovi filtro prezzo", "Supprimer le filtre prix")}
            </button>
          )}
        </div>
      </FilterGroup>

      {/* Disponibilità */}
      <FilterGroup label={tr("Disponibilità", "Disponibilité")} open={expanded.availability} onToggle={() => toggleExpand("availability")}>
        <label className="flex items-center gap-2 py-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => updateQuery({ onlyAvailable: e.target.checked ? "1" : null })}
          />
          <span className="text-warm-700">{tr("Solo prodotti disponibili", "Uniquement les produits disponibles")}</span>
        </label>
      </FilterGroup>

      {/* Attributi per tipo */}
      {SHOP_FILTER_TYPES.map((t) => {
        const vals = byType(t);
        if (vals.length === 0) return null;
        return (
          <FilterGroup key={t} label={tr(TYPE_LABEL[t], TYPE_LABEL_FR[t])} open={!!expanded[t]} onToggle={() => toggleExpand(t)}>
            <div className={t === "COLOR" ? "flex flex-wrap gap-2" : "space-y-1"}>
              {vals.map((v) => {
                const isSel = selectedAttrs.has(v.id);
                if (t === "COLOR") {
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleAttr(v.id)}
                      title={label(v)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${isSel ? "border-warm-900 scale-110" : "border-warm-200 hover:border-warm-400"}`}
                      style={{ backgroundColor: v.hexColor || "#ccc" }}
                    />
                  );
                }
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleAttr(v.id)}
                    className={`block w-full text-left py-1 text-xs ${isSel ? "text-warm-900 font-medium" : "text-warm-600 hover:text-warm-900"}`}
                  >
                    <span className={`inline-block w-3 h-3 mr-2 border align-middle ${isSel ? "bg-warm-900 border-warm-900" : "border-warm-300"}`} />
                    {label(v)}
                  </button>
                );
              })}
            </div>
          </FilterGroup>
        );
      })}
    </div>
  );
}

function FilterGroup({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-warm-200 pt-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-warm-900 uppercase tracking-wider text-[11px]">{label}</span>
        <ChevronDown size={14} className={`text-warm-400 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && children}
    </div>
  );
}
