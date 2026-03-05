"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import type { Catalog } from "@/types";

export default function AdminCatalogsPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = () => {
    fetch("/api/catalogs?all=1")
      .then((r) => r.json())
      .then((data) => { setCatalogs(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchCatalogs(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo catalogo?")) return;
    await fetch(`/api/catalogs/${id}`, { method: "DELETE" });
    fetchCatalogs();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Cataloghi</h1>
        <Link
          href="/admin/catalogs/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          <Plus size={16} /> Nuovo catalogo
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Sezione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">PDF</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Stato</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {catalogs.map((c) => (
                <tr key={c.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="w-12 h-16 relative rounded overflow-hidden bg-warm-100">
                      {c.imageUrl ? (
                        <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{c.name}</td>
                  <td className="px-6 py-4 text-warm-600 capitalize">{c.section || "—"}</td>
                  <td className="px-6 py-4">
                    {c.pdfUrl ? (
                      <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-warm-500 hover:text-warm-800 transition-colors">
                        <FileText size={14} /> PDF
                      </a>
                    ) : (
                      <span className="text-warm-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-warm-300"}`} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/catalogs/${c.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {catalogs.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun catalogo trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
