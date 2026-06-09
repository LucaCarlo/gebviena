"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Upload, Copy, Eye, EyeOff } from "lucide-react";
import type { Campaign } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchCampaigns = () => {
    fetch("/api/campaigns?admin=true")
      .then((r) => r.json())
      .then((data) => { setCampaigns(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa campagna?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchCampaigns();
    } else {
      alert("Errore duplicazione: " + (data.error || "sconosciuto"));
    }
  };

  const handleTogglePublish = async (id: string, currentIsActive: boolean) => {
    const next = !currentIsActive;
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: next } : c)));
    const res = await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!data.success) {
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: currentIsActive } : c)));
      alert("Errore aggiornamento stato: " + (data.error || "sconosciuto"));
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/campaigns");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "campaigns.json";
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
      const res = await fetch("/api/import/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchCampaigns();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const years = Array.from(new Set(campaigns.map((c) => c.year).filter((v): v is number => !!v))).sort((a, b) => b - a);
    return [
      { key: "year", label: "Tutti gli anni", options: years.map((y) => ({ value: String(y), label: String(y) })) },
    ];
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((c) => c.name.toLowerCase().includes(q));
    if (activeFilters.year) result = result.filter((c) => String(c.year) === activeFilters.year);
    return result;
  }, [campaigns, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Campagne</h1>
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
            href="/admin/campaigns/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuova campagna
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
          searchPlaceholder="Cerca campagna..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={campaigns.length}
          filteredCount={filteredCampaigns.length}
        />
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filteredCampaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-warm-200 p-3">
              <div className="flex items-start gap-3">
                <Link href={`/admin/campaigns/${c.id}`} className="block shrink-0">
                  <div className="w-14 h-14 relative rounded overflow-hidden bg-warm-100">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                    )}
                  </div>
                </Link>
                <Link href={`/admin/campaigns/${c.id}`} className="flex-1 min-w-0 block">
                  <div className="font-medium text-warm-800 truncate">{c.name}</div>
                  {c.subtitle && (
                    <div className="text-[11px] text-warm-600 truncate">{c.subtitle}</div>
                  )}
                  <div className="text-[11px] text-warm-500 truncate">{c.year || "—"}</div>
                </Link>
                <button onClick={() => handleDuplicate(c.id)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title="Duplica">
                  <Copy size={14} />
                </button>
                <button onClick={() => handleTogglePublish(c.id, c.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 shrink-0" title={c.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                  {c.isActive !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-warm-400 hover:text-red-600 shrink-0" title="Elimina">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">Nessuna campagna trovata</div>
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Sottotitolo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Anno</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredCampaigns.map((c) => (
                <tr
                  key={c.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button")) return;
                    router.push(`/admin/campaigns/${c.id}`);
                  }}
                  className="hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-3">
                    <div className="w-12 h-12 relative rounded overflow-hidden bg-warm-100">
                      {c.imageUrl ? (
                        <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{c.name}</td>
                  <td className="px-6 py-4 text-warm-600">{c.subtitle || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{c.year || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/campaigns/${c.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDuplicate(c.id)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Duplica">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleTogglePublish(c.id, c.isActive !== false)} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title={c.isActive !== false ? "Metti in bozza" : "Pubblica"}>
                        {c.isActive !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors" title="Elimina">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuna campagna trovata</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
