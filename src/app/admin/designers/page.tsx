"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Designer } from "@/types";

interface DesignerWithCount extends Designer {
  _count?: { products: number };
}

export default function AdminDesignersPage() {
  const [designers, setDesigners] = useState<DesignerWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDesigners = () => {
    fetch("/api/designers")
      .then((r) => r.json())
      .then((data) => { setDesigners(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchDesigners(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo designer?")) return;
    await fetch(`/api/designers/${id}`, { method: "DELETE" });
    fetchDesigners();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Designer</h1>
        <Link
          href="/admin/designers/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuovo designer
        </Link>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Paese</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">N. Prodotti</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {designers.map((d) => (
                <tr key={d.id} className="hover:bg-warm-50 transition-colors">
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
                  <td className="px-6 py-4 text-warm-600">{d.country || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{d._count?.products ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/designers/${d.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {designers.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun designer trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
