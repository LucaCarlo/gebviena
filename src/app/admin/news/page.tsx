"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import type { NewsArticle } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

interface CategoryItem {
  value: string;
  label: string;
  id: string;
}

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchArticles = () => {
    fetch("/api/news?admin=true&limit=500")
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchArticles();
    fetch("/api/categories?contentType=news")
      .then((r) => r.json())
      .then((data) => setCategories(data.data || []));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo articolo?")) return;
    await fetch(`/api/news/${id}`, { method: "DELETE" });
    fetchArticles();
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/news");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "news.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert("Errore: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.data?.imported ?? 0} elementi`);
        fetchArticles();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const catOptions = categories.map((c) => ({ value: c.value, label: c.label }));
    return [
      { key: "category", label: "Tutte le categorie", options: catOptions },
      {
        key: "status",
        label: "Tutti gli stati",
        options: [
          { value: "active", label: "Attivo" },
          { value: "inactive", label: "Non attivo" },
        ],
      },
    ];
  }, [categories]);

  const filteredArticles = useMemo(() => {
    let result = articles;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((a) => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q));
    if (activeFilters.category) result = result.filter((a) => a.category === activeFilters.category);
    if (activeFilters.status === "active") result = result.filter((a) => a.isActive);
    if (activeFilters.status === "inactive") result = result.filter((a) => !a.isActive);
    return result;
  }, [articles, search, activeFilters]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">News</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            <Download size={16} /> Esporta
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            <Upload size={16} /> Importa
          </button>
          <input type="file" ref={importRef} accept=".json" className="hidden" onChange={handleImport} />
          <Link
            href="/admin/news/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo articolo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <>
          <AdminListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Cerca articolo..."
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
            totalCount={articles.length}
            filteredCount={filteredArticles.length}
          />
          <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 border-b border-warm-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider w-16"></th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Titolo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Categoria</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Data</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Stato</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filteredArticles.map((a) => (
                  <tr key={a.id} className="hover:bg-warm-50 transition-colors">
                    <td className="px-6 py-3">
                      {a.imageUrl && (
                        <div className="w-10 h-10 relative rounded overflow-hidden bg-warm-100 flex-shrink-0">
                          <Image src={a.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-warm-800">{a.title}</td>
                    <td className="px-6 py-4 text-warm-600">{a.category || "—"}</td>
                    <td className="px-6 py-4 text-warm-600">{formatDate(a.publishedAt)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.isActive ? "bg-green-100 text-green-700" : "bg-warm-100 text-warm-500"
                        }`}
                      >
                        {a.isActive ? "Attivo" : "Bozza"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/news/${a.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredArticles.length === 0 && (
              <div className="text-center py-12 text-warm-400">Nessun articolo trovato</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
