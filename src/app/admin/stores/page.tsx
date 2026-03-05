"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import type { PointOfSale } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

export default function AdminStoresPage() {
  const [stores, setStores] = useState<PointOfSale[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchStores = () => {
    fetch("/api/stores?type=STORE")
      .then((r) => r.json())
      .then((data) => { setStores(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchStores(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo negozio?")) return;
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    fetchStores();
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/stores");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stores.json";
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
      const res = await fetch("/api/import/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchStores();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const countries = Array.from(new Set(stores.map((s) => s.country).filter((v): v is string => !!v))).sort();
    const cities = Array.from(new Set(stores.map((s) => s.city).filter((v): v is string => !!v))).sort();
    return [
      { key: "country", label: "Tutti i paesi", options: countries.map((c) => ({ value: c, label: c })) },
      { key: "city", label: "Tutte le città", options: cities.map((c) => ({ value: c, label: c })) },
    ];
  }, [stores]);

  const filteredStores = useMemo(() => {
    let result = stores;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((s) => s.name.toLowerCase().includes(q));
    if (activeFilters.country) result = result.filter((s) => s.country === activeFilters.country);
    if (activeFilters.city) result = result.filter((s) => s.city === activeFilters.city);
    return result;
  }, [stores, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Negozi</h1>
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
            href="/admin/stores/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo negozio
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
          searchPlaceholder="Cerca negozio..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={stores.length}
          filteredCount={filteredStores.length}
        />
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Città</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Paese</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Telefono</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-warm-800">{store.name}</td>
                  <td className="px-6 py-4 text-warm-600">{store.city}</td>
                  <td className="px-6 py-4 text-warm-600">{store.country}</td>
                  <td className="px-6 py-4 text-warm-600">{store.phone || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/stores/${store.id}`}
                        className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="p-1.5 text-warm-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStores.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun negozio trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
