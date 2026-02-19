"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Finish } from "@/types";

export default function AdminFinishesPage() {
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinishes = () => {
    fetch("/api/finishes")
      .then((r) => r.json())
      .then((data) => { setFinishes(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchFinishes(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa finitura?")) return;
    await fetch(`/api/finishes/${id}`, { method: "DELETE" });
    fetchFinishes();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Finiture</h1>
        <Link
          href="/admin/finishes/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuova finitura
        </Link>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Colore</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Codice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Categoria</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {finishes.map((f) => (
                <tr key={f.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3">
                    <div
                      className="w-8 h-8 rounded-full border border-warm-200"
                      style={{ backgroundColor: f.colorHex || "#ccc" }}
                      title={f.colorHex || "Nessun colore"}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{f.name}</td>
                  <td className="px-6 py-4 text-warm-600">{f.code || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-warm-100 text-warm-600 text-xs rounded">{f.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/finishes/${f.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(f.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {finishes.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuna finitura trovata</div>
          )}
        </div>
      )}
    </div>
  );
}
