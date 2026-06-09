"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Upload, Copy, Eye, EyeOff } from "lucide-react";
import type { Designer } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

interface DesignerWithCount extends Designer {
  _count?: { products: number };
}

export default function AdminDesignersPage() {
  const router = useRouter();
  const [designers, setDesigners] = useState<DesignerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchDesigners = () => {
    fetch("/api/designers?admin=true")
      .then((r) => r.json())
      .then((data) => { setDesigners(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchDesigners(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo designer?")) return;
    await fetch(`/api/designers/${id}`, { method: "DELETE" });
    fetchDesigners();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/designers/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchDesigners();
    } else {
      alert("Errore duplicazione: " + (data.error || "sconosciuto"));
    }
  };

  const handleTogglePublish = async (id: string, currentIsActive: boolean) => {
    const next = !currentIsActive;
    setDesigners((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: next } : d)));
    const res = await fetch(`/api/designers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!data.success) {
      setDesigners((prev) => prev.map((d) => (d.id === id ? { ...d, isActive: currentIsActive } : d)));
      alert("Errore aggiornamento stato: " + (data.error || "sconosciuto"));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/designers");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "designers.json";
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
      const res = await fetch("/api/import/designers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchDesigners();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const countries = Array.from(new Set(designers.map((d) => d.country).filter((v): v is string => !!v))).sort();
    return [
      { key: "country", label: "Tutti i paesi", options: countries.map((c) => ({ value: c, label: c })) },
    ];
  }, [designers]);

  const filteredDesigners = useMemo(() => {
    let result = designers;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((d) => d.name.toLowerCase().includes(q));
    if (activeFilters.country) result = result.filter((d) => d.country === activeFilters.country);
    return result;
  }, [designers, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Designer</h1>
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
            href="/admin/designers/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo designer
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
          searchPlaceholder="Cerca designer..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={designers.length}
          filteredCount={filteredDesigners.length}
        />
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filteredDesigners.map((d) => (
            <div key={d.id} className="bg-white rounded-lg border border-warm-200 p-3">
              <div className="flex items-start gap-3">
                <Link href={`/admin/designers/${d.id}`} className="block shrink-0">
                  <div className="w-14 h-14 relative rounded-full overflow-hidden bg-warm-100">
                    {d.imageUrl ? (
                      <Image src={d.imageUrl} alt={d.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                    )}
                  </div>
                </Link>
                <Link href={`/admin/designers/${d.id}`} className="flex-1 min-w-0 block">
                  <div className="font-medium text-warm-800 truncate">{d.name}</div>
                  <div className="text-[11px] text-warm-500 font-mono truncate">{d.slug}</div>
                  <div className="text-[11px] text-warm-600 truncate">
                    {(d.country || "—") + " · " + (d._count?.products ?? 0) + " prodotti"}
                  </div>
                </Link>
                <button onClick={() => handleDuplicate(d.id)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title="Duplica">
                  <Copy size={14} />
                </button>
                <button onClick={() => handleTogglePublish(d.id, d.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title={d.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                  {d.isActive !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => handleDelete(d.id)} className="p-1.5 text-warm-400 hover:text-red-600 shrink-0" title="Elimina">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filteredDesigners.length === 0 && (
            <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">Nessun designer trovato</div>
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Slug</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Paese</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">N. Prodotti</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredDesigners.map((d) => (
                <tr
                  key={d.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button")) return;
                    router.push(`/admin/designers/${d.id}`);
                  }}
                  className="hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <div className="w-10 h-10 relative rounded-full overflow-hidden bg-warm-100">
                      {d.imageUrl ? (
                        <Image src={d.imageUrl} alt={d.name} fill className="object-cover" sizes="40px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{d.name}</td>
                  <td className="px-6 py-4 text-warm-500 text-xs font-mono">{d.slug}</td>
                  <td className="px-6 py-4 text-warm-600">{d.country || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{d._count?.products ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/designers/${d.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDuplicate(d.id)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Duplica">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleTogglePublish(d.id, d.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title={d.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                        {d.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors" title="Elimina">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDesigners.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun designer trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
