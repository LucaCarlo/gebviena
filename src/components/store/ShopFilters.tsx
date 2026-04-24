"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

interface AttrValue {
  id: string;
  type: "MATERIAL" | "FINISH" | "COLOR" | "OTHER";
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
  OTHER: "Altro",
};

export default function ShopFilters() {
  const router = useRouter();
  const search = useSearchParams();

  const [attrs, setAttrs] = useState<AttrValue[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ category: true, MATERIAL: true, FINISH: true, COLOR: true });

  useEffect(() => {
    fetch("/api/store/public/attributes").then((r) => r.json()).then((d) => d.success && setAttrs(d.data));
    fetch("/api/store/public/categories").then((r) => r.json()).then((d) => d.success && setCats(d.data));
  }, []);

  const selectedCategoryId = search.get("categoryId") || "";
  const selectedAttrs = new Set((search.get("attrs") || "").split(",").filter(Boolean));

  const updateQuery = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/?${params.toString()}`);
  };

  const toggleAttr = (id: string) => {
    const next = new Set(selectedAttrs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateQuery({ attrs: Array.from(next).join(",") || null });
  };

  const hasAnyFilter = selectedCategoryId || selectedAttrs.size > 0;

  const toggleExpand = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  const byType = (t: AttrValue["type"]) => attrs.filter((a) => a.type === t);
  const label = (a: AttrValue) => a.translations.find((x) => x.languageCode === "it")?.label || a.code;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.2em] text-warm-500">Filtri</h2>
        {hasAnyFilter && (
          <button
            onClick={() => router.push("/")}
            className="text-xs text-warm-500 hover:text-warm-900 inline-flex items-center gap-1"
          >
            <X size={11} /> Reset
          </button>
        )}
      </div>

      {/* Categoria */}
      <FilterGroup label="Categoria" open={expanded.category} onToggle={() => toggleExpand("category")}>
        <div className="space-y-1">
          <button
            onClick={() => updateQuery({ categoryId: null })}
            className={`block w-full text-left py-1 ${!selectedCategoryId ? "text-warm-900 font-medium" : "text-warm-600 hover:text-warm-900"}`}
          >
            Tutte
          </button>
          {cats.filter((c) => !c.parentId).map((c) => {
            const name = c.translations.find((t) => t.languageCode === "it")?.name || c.slug;
            const isSel = selectedCategoryId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => updateQuery({ categoryId: c.id })}
                className={`block w-full text-left py-1 ${isSel ? "text-warm-900 font-medium" : "text-warm-600 hover:text-warm-900"}`}
              >
                {name}
              </button>
            );
          })}
          {cats.length === 0 && <div className="text-warm-400 italic text-xs">Nessuna categoria pubblicata.</div>}
        </div>
      </FilterGroup>

      {/* Attributi per tipo */}
      {(["MATERIAL", "FINISH", "COLOR"] as AttrValue["type"][]).map((t) => {
        const vals = byType(t);
        if (vals.length === 0) return null;
        return (
          <FilterGroup key={t} label={TYPE_LABEL[t]} open={!!expanded[t]} onToggle={() => toggleExpand(t)}>
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
