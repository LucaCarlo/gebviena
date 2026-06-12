"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, Copy, Eye, EyeOff, Settings } from "lucide-react";
import type { Catalog } from "@/types";

export default function AdminCatalogsPage() {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = () => {
    fetch("/api/catalogs?admin=true")
      .then((r) => r.json())
      .then((data) => { setCatalogs(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchCatalogs(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo catalogo?")) return;
    await fetch(`/api/catalogs/${id}`, { method: "DELETE" });
    fetchCatalogs();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/catalogs/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchCatalogs();
    } else {
      alert("Errore duplicazione: " + (data.error || "sconosciuto"));
    }
  };

  const handleTogglePublish = async (id: string, currentIsActive: boolean) => {
    const next = !currentIsActive;
    setCatalogs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: next } : c)));
    const res = await fetch(`/api/catalogs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json();
    if (!data.success) {
      setCatalogs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: currentIsActive } : c)));
      alert("Errore aggiornamento stato: " + (data.error || "sconosciuto"));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-warm-800">Cataloghi</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/catalogs/categories"
            className="flex items-center gap-2 border border-warm-300 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-100 transition-colors"
          >
            <Settings size={14} /> Categorie
          </Link>
          <Link
            href="/admin/catalogs/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo catalogo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <>
        {/* Mobile: card list */}
        <div className="md:hidden space-y-2">
          {catalogs.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-warm-200 p-3">
              <div className="flex items-start gap-3">
                <Link href={`/admin/catalogs/${c.id}`} className="block shrink-0">
                  <div className="w-12 h-16 relative rounded overflow-hidden bg-warm-100">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                    )}
                  </div>
                </Link>
                <Link href={`/admin/catalogs/${c.id}`} className="flex-1 min-w-0 block">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${c.isActive ? "bg-green-500" : "bg-warm-300"}`} />
                    <div className="font-medium text-warm-800 truncate">{c.name}</div>
                  </div>
                  <div className="text-[11px] text-warm-600 capitalize truncate">{c.section || "—"}</div>
                  {c.pdfUrl && (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-warm-500 hover:text-warm-800 transition-colors mt-1">
                      <FileText size={12} /> PDF
                    </a>
                  )}
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
          {catalogs.length === 0 && (
            <div className="text-center py-12 text-warm-400 bg-white rounded-lg border border-warm-200">Nessun catalogo trovato</div>
          )}
        </div>

        {/* Desktop: tabella */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Categoria</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">PDF</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {catalogs.map((c) => (
                <tr
                  key={c.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button")) return;
                    router.push(`/admin/catalogs/${c.id}`);
                  }}
                  className="hover:bg-warm-50 transition-colors cursor-pointer"
                >
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/catalogs/${c.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors" title="Modifica">
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
          {catalogs.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun catalogo trovato</div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
