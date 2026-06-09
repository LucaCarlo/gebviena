"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Upload, Copy, Eye, EyeOff } from "lucide-react";
import type { Award } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

export default function AdminAwardsPage() {
  const router = useRouter();
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchAwards = () => {
    fetch("/api/awards?admin=true")
      .then((r) => r.json())
      .then((data) => { setAwards(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchAwards(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo premio?")) return;
    await fetch(`/api/awards/${id}`, { method: "DELETE" });
    fetchAwards();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/awards/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchAwards();
    } else {
      alert("Errore duplicazione: " + (data.error || "sconosciuto"));
    }
  };

  const handleTogglePublish = async (id: string, currentIsActive: boolean) => {
    const next = !currentIsActive;
    setAwards((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: next } : a)));
    const res = await fetch(`/api/awards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!data.success) {
      setAwards((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: currentIsActive } : a)));
      alert("Errore aggiornamento stato: " + (data.error || "sconosciuto"));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/awards");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "awards.json";
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
      const res = await fetch("/api/import/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchAwards();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const years = Array.from(new Set(awards.map((a) => a.year).filter((v): v is number => !!v))).sort((a, b) => b - a);
    const orgs = Array.from(new Set(awards.map((a) => a.organization).filter((v): v is string => !!v))).sort();
    return [
      { key: "year", label: "Tutti gli anni", options: years.map((y) => ({ value: String(y), label: String(y) })) },
      { key: "organization", label: "Tutte le organizzazioni", options: orgs.map((o) => ({ value: o, label: o })) },
    ];
  }, [awards]);

  const filteredAwards = useMemo(() => {
    let result = awards;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((a) => a.name.toLowerCase().includes(q));
    if (activeFilters.year) result = result.filter((a) => String(a.year) === activeFilters.year);
    if (activeFilters.organization) result = result.filter((a) => a.organization === activeFilters.organization);
    return result;
  }, [awards, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Premi</h1>
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
            href="/admin/awards/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo premio
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
          searchPlaceholder="Cerca premio..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={awards.length}
          filteredCount={filteredAwards.length}
        />
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filteredAwards.map((a) => (
            <div key={a.id} className="bg-white rounded-lg border border-warm-200 p-3">
              <div className="flex items-start gap-3">
                <Link href={`/admin/awards/${a.id}`} className="flex-1 min-w-0 block">
                  <div className="font-medium text-warm-800 truncate">{a.name}</div>
                  <div className="text-[11px] text-warm-600 truncate">
                    {(a.organization || "—") + " · " + (a.year || "—") + " · " + (a._count?.products ?? 0) + " prodotti"}
                  </div>
                </Link>
                <button onClick={() => handleDuplicate(a.id)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title="Duplica">
                  <Copy size={14} />
                </button>
                <button onClick={() => handleTogglePublish(a.id, a.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title={a.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                  {a.isActive !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-warm-400 hover:text-red-600 shrink-0" title="Elimina">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filteredAwards.length === 0 && (
            <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">Nessun premio trovato</div>
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Prodotti</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Anno</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Organizzazione</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredAwards.map((a) => (
                <tr
                  key={a.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button, input, label")) return;
                    router.push(`/admin/awards/${a.id}`);
                  }}
                  className="hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-warm-800">{a.name}</td>
                  <td className="px-6 py-4 text-warm-600">{a._count?.products ?? 0}</td>
                  <td className="px-6 py-4 text-warm-600">{a.year || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{a.organization || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/awards/${a.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDuplicate(a.id)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Duplica">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleTogglePublish(a.id, a.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title={a.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                        {a.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors" title="Elimina">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAwards.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun premio trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
