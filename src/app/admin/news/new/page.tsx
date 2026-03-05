"use client";

import { useState } from "react";
import { Newspaper, Calendar, BookOpen, History } from "lucide-react";
import NewsForm from "@/components/admin/NewsForm";

const CATEGORIES = [
  { value: "exhibition", label: "Exhibition", icon: Calendar, description: "Mostre, fiere ed eventi espositivi" },
  { value: "news", label: "News", icon: Newspaper, description: "Notizie e comunicati stampa" },
  { value: "rassegna-stampa", label: "Rassegna stampa", icon: BookOpen, description: "Articoli e menzioni sulla stampa" },
  { value: "storia", label: "Storia", icon: History, description: "Racconti storici e heritage del brand" },
];

export default function NewNewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!selectedCategory) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-warm-800 mb-2">Nuovo Articolo</h1>
        <p className="text-sm text-warm-400 mb-10">Scegli la categoria. Determina la struttura della pagina e non potr&agrave; essere modificata.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className="group flex flex-col items-center gap-3 p-8 bg-white rounded-xl border border-warm-200 hover:border-warm-800 hover:shadow-md transition-all text-center"
              >
                <Icon size={28} className="text-warm-400 group-hover:text-warm-800 transition-colors" />
                <span className="text-sm font-semibold text-warm-800 uppercase tracking-wider">{cat.label}</span>
                <span className="text-xs text-warm-400 leading-relaxed">{cat.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const catLabel = CATEGORIES.find((c) => c.value === selectedCategory)?.label || selectedCategory;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Nuovo Articolo</h1>
        <span className="px-3 py-1 bg-warm-100 text-warm-700 text-xs font-semibold uppercase tracking-wider rounded-full">{catLabel}</span>
      </div>
      <NewsForm category={selectedCategory} />
    </div>
  );
}
