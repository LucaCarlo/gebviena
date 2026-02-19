"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Language } from "@/types";

export default function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLanguages = () => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => { setLanguages(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchLanguages(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa lingua?")) return;
    await fetch(`/api/languages/${id}`, { method: "DELETE" });
    fetchLanguages();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Lingue</h1>
        <Link
          href="/admin/languages/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuova lingua
        </Link>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Flag</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Codice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Default</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Attiva</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {languages.map((l) => (
                <tr key={l.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-4 text-2xl">{l.flag || "🏳"}</td>
                  <td className="px-6 py-4 font-medium text-warm-800">{l.name}</td>
                  <td className="px-6 py-4 text-warm-600 uppercase">{l.code}</td>
                  <td className="px-6 py-4">
                    {l.isDefault && (
                      <span className="px-2 py-1 bg-warm-800 text-white text-xs rounded">Default</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${l.isActive ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/languages/${l.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {languages.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuna lingua trovata</div>
          )}
        </div>
      )}
    </div>
  );
}
