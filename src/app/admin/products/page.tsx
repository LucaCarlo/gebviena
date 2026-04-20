"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Download, Upload, FileSpreadsheet, FileJson } from "lucide-react";
import type { Product } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

/* ─── CSV helpers ─── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { cols.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeCSV(val: string | null | undefined): string {
  const s = val || "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchProducts = () => {
    fetch("/api/products?limit=10000")
      .then((r) => r.json())
      .then((data) => { setProducts(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  /* ── Export JSON ── */
  const handleExportJSON = async () => {
    setShowExportMenu(false);
    const res = await fetch("/api/export/products");
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ── Export CSV ── */
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    const res = await fetch("/api/export/products");
    const data = await res.json();
    if (!data.success) return;
    const items = data.data as Product[];
    const headers = ["Nome", "Slug", "Designer", "Tipologia", "Categoria", "Descrizione", "Materiali", "Dimensioni", "Immagine Cover", "In Evidenza", "Nuovo", "Attivo"];
    const rows = items.map((p) => [
      escapeCSV(p.name),
      escapeCSV(p.slug),
      escapeCSV(p.designerName),
      escapeCSV(p.category),
      escapeCSV(p.subcategory),
      escapeCSV(p.description),
      escapeCSV(p.materials),
      escapeCSV(p.dimensions),
      escapeCSV(p.coverImage || p.imageUrl),
      p.isFeatured ? "Si" : "No",
      p.isNew ? "Si" : "No",
      p.isActive ? "Si" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Import (JSON or CSV) ── */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const isCSV = file.name.toLowerCase().endsWith(".csv");

    try {
      let items: Record<string, unknown>[];

      if (isCSV) {
        const rows = parseCSV(text);
        if (rows.length === 0) { alert("File CSV vuoto o non valido"); return; }

        // Detect columns — flexible mapping
        const sample = Object.keys(rows[0]);
        const colMap: Record<string, string> = {};
        for (const col of sample) {
          const lc = col.toLowerCase().trim();
          if (lc === "titolo" || lc === "nome" || lc === "name") colMap.name = col;
          else if (lc === "slug") colMap.slug = col;
          else if (lc === "designer") colMap.designer = col;
          else if (lc.includes("categori") || lc === "tipologia" || lc === "category") colMap.category = col;
          else if (lc === "sottocategoria" || lc === "subcategory") colMap.subcategory = col;
          else if (lc === "descrizione" || lc === "description") colMap.description = col;
          else if (lc === "materiali" || lc === "materials") colMap.materials = col;
          else if (lc === "dimensioni" || lc === "dimensions") colMap.dimensions = col;
          else if (lc.includes("immagine") || lc === "image" || lc === "imageurl" || lc === "immagine cover") colMap.imageUrl = col;
        }

        if (!colMap.name) {
          alert("Colonna 'Titolo' o 'Nome' non trovata nel CSV.\nColonne trovate: " + sample.join(", "));
          return;
        }

        items = rows
          .filter((row) => row[colMap.name]?.trim())
          .map((row) => ({
            name: row[colMap.name],
            slug: row[colMap.slug] || slugify(row[colMap.name]),
            designerName: row[colMap.designer] || "N/A",
            category: row[colMap.category] || "Altro",
            subcategory: row[colMap.subcategory] || "",
            description: row[colMap.description] || "",
            materials: row[colMap.materials] || "",
            dimensions: row[colMap.dimensions] || "",
            imageUrl: row[colMap.imageUrl] || "",
            coverImage: row[colMap.imageUrl] || "",
            isActive: true,
            isFeatured: false,
            isNew: false,
            sortOrder: 0,
          }));

        if (items.length === 0) { alert("Nessun prodotto valido trovato nel CSV"); return; }
      } else {
        const json = JSON.parse(text);
        items = json.data || json;
        if (!Array.isArray(items)) { alert("Formato JSON non valido"); return; }
      }

      const res = await fetch("/api/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: items }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.data.imported} prodotti`);
        fetchProducts();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (err) {
      alert(`Errore nel file: ${err}`);
    }
    if (importRef.current) importRef.current.value = "";
  };

  const filters = useMemo(() => {
    const designers = Array.from(new Set(products.map((p) => p.designerName).filter((v): v is string => !!v))).sort();
    const categories = Array.from(new Set(products.map((p) => p.category).filter((v): v is string => !!v))).sort();
    const subcategories = Array.from(new Set(products.map((p) => p.subcategory).filter((v): v is string => !!v))).sort();
    return [
      { key: "designer", label: "Tutti i designer", options: designers.map((d) => ({ value: d, label: d })) },
      { key: "category", label: "Tutte le tipologie", options: categories.map((c) => ({ value: c, label: c })) },
      { key: "subcategory", label: "Tutte le categorie", options: subcategories.map((s) => ({ value: s, label: s })) },
      {
        key: "techSheet",
        label: "Tutte le schede tecniche",
        options: [
          { value: "with", label: "Con scheda tecnica" },
          { value: "without", label: "Senza scheda tecnica" },
        ],
      },
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q) || p.designerName?.toLowerCase().includes(q));
    if (activeFilters.designer) result = result.filter((p) => p.designerName === activeFilters.designer);
    if (activeFilters.category) result = result.filter((p) => p.category?.includes(activeFilters.category));
    if (activeFilters.subcategory) result = result.filter((p) => p.subcategory === activeFilters.subcategory);
    if (activeFilters.techSheet === "with") result = result.filter((p) => !!p.techSheetUrl);
    if (activeFilters.techSheet === "without") result = result.filter((p) => !p.techSheetUrl);
    return result;
  }, [products, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Prodotti</h1>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
            >
              <Download size={14} /> Esporta
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 z-20 bg-white border border-warm-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
                  >
                    <FileSpreadsheet size={14} /> Esporta CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
                  >
                    <FileJson size={14} /> Esporta JSON
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
          >
            <Upload size={14} /> Importa
          </button>
          <input ref={importRef} type="file" accept=".json,.csv" onChange={handleImport} className="hidden" />
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo prodotto
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
          searchPlaceholder="Cerca prodotto o designer..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={products.length}
          filteredCount={filteredProducts.length}
        />
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Designer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Tipologia</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Categoria</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="w-12 h-12 relative rounded overflow-hidden bg-warm-100">
                      <Image src={p.coverImage || p.imageUrl} alt={p.name} fill className="object-cover" sizes="48px" />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{p.name}</td>
                  <td className="px-6 py-4 text-warm-600">{p.designerName || p.designer?.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.category || "").split(",").filter(Boolean).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-warm-100 text-warm-600 text-xs rounded">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-warm-500 text-xs">{p.subcategory || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${p.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun prodotto trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
