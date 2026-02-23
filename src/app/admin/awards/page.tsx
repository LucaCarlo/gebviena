"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import type { Award } from "@/types";

export default function AdminAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const fetchAwards = () => {
    fetch("/api/awards")
      .then((r) => r.json())
      .then((data) => { setAwards(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchAwards(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo premio?")) return;
    await fetch(`/api/awards/${id}`, { method: "DELETE" });
    fetchAwards();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
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
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Prodotto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Anno</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Organizzazione</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {awards.map((a) => (
                <tr key={a.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-warm-800">{a.name}</td>
                  <td className="px-6 py-4 text-warm-600">{a.productName || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{a.year || "—"}</td>
                  <td className="px-6 py-4 text-warm-600">{a.organization || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/awards/${a.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {awards.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun premio trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
