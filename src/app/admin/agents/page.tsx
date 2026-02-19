"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PointOfSale } from "@/types";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<PointOfSale[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Agenti & Distributori</h1>
        <Link
          href="/admin/agents/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuovo agente
        </Link>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
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
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-warm-50 transition-colors">
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
          {agents.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun agente trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
