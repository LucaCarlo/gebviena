"use client";

import { Search, X } from "lucide-react";

export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface AdminListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterDef[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  totalCount: number;
  filteredCount: number;
}

export default function AdminListFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Cerca per nome...",
  filters,
  activeFilters,
  onFilterChange,
  totalCount,
  filteredCount,
}: AdminListFiltersProps) {
  const hasActiveFilters = search.trim() !== "" || Object.values(activeFilters).some((v) => v !== "");

  const clearAll = () => {
    onSearchChange("");
    filters.forEach((f) => onFilterChange(f.key, ""));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter selects */}
        {filters.map((f) => (
          <select
            key={f.key}
            value={activeFilters[f.key] || ""}
            onChange={(e) => onFilterChange(f.key, e.target.value)}
            className="border border-warm-300 rounded-lg px-3 py-2 text-sm text-warm-700 bg-white focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 transition-colors min-w-[140px]"
          >
            <option value="">{f.label}</option>
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}

        {/* Clear + Count */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-warm-500 hover:text-warm-800 transition-colors"
          >
            <X size={13} /> Resetta filtri
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-[11px] text-warm-400 mt-2">
          {filteredCount} di {totalCount} risultati
        </p>
      )}
    </div>
  );
}
