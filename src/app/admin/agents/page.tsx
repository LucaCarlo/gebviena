"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import type { PointOfSale } from "@/types";
import AdminListFilters from "@/components/admin/AdminListFilters";

export default function AdminAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<PointOfSale[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const fetchAgents = () => {
    fetch("/api/stores?type=AGENT")
      .then((r) => r.json())
      .then((data) => { setAgents(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo agente?")) return;
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    fetchAgents();
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/agents");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "agents.json";
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
      const res = await fetch("/api/import/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchAgents();
      } else {
        alert("Errore: " + (data.error || "Importazione fallita"));
      }
    } catch {
      alert("File JSON non valido");
    }
    e.target.value = "";
  };

  const filters = useMemo(() => {
    const countries = Array.from(new Set(agents.map((a) => a.country).filter((v): v is string => !!v))).sort();
    const cities = Array.from(new Set(agents.map((a) => a.city).filter((v): v is string => !!v))).sort();
    return [
      { key: "country", label: "Tutti i paesi", options: countries.map((c) => ({ value: c, label: c })) },
      { key: "city", label: "Tutte le città", options: cities.map((c) => ({ value: c, label: c })) },
    ];
  }, [agents]);

  const filteredAgents = useMemo(() => {
    let result = agents;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((a) => a.name.toLowerCase().includes(q));
    if (activeFilters.country) result = result.filter((a) => a.country === activeFilters.country);
    if (activeFilters.city) result = result.filter((a) => a.city === activeFilters.city);
    return result;
  }, [agents, search, activeFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Agenti & Distributori</h1>
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
            href="/admin/agents/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo agente
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
          searchPlaceholder="Cerca agente..."
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          totalCount={agents.length}
          filteredCount={filteredAgents.length}
        />
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {filteredAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/admin/agents/${agent.id}`}
              className="block bg-white rounded-lg border border-warm-200 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-warm-800 truncate">{agent.name}</div>
                  <div className="text-[11px] text-warm-600 truncate">
                    {(agent.city || "—") + " · " + (agent.country || "—")}
                  </div>
                  {agent.email && (
                    <div className="text-[11px] text-warm-500 truncate">{agent.email}</div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(agent.id); }}
                  className="p-1.5 text-warm-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Link>
          ))}
          {filteredAgents.length === 0 && (
            <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">Nessun agente trovato</div>
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Città</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Paese</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Email</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {filteredAgents.map((agent) => (
                <tr
                  key={agent.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button, input, label")) return;
                    router.push(`/admin/agents/${agent.id}`);
                  }}
                  className="hover:bg-warm-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-warm-800">{agent.name}</td>
                  <td className="px-6 py-4 text-warm-600">{agent.city}</td>
                  <td className="px-6 py-4 text-warm-600">{agent.country}</td>
                  <td className="px-6 py-4 text-warm-600">{agent.email || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/agents/${agent.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(agent.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAgents.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun agente trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
