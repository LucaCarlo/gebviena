"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Download, Upload } from "lucide-react";
import type { Project } from "@/types";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const fetchProjects = () => {
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((data) => { setProjects(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo progetto?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const handleExport = async () => {
    const res = await fetch("/api/export/projects");
    const data = await res.json();
    if (data.success) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projects-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      const res = await fetch("/api/import/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.data.imported} progetti`);
        fetchProjects();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch {
      alert("File JSON non valido");
    }
    if (importRef.current) importRef.current.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-warm-800">Progetti</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
          >
            <Download size={14} /> Esporta
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-warm-600 border border-warm-300 hover:bg-warm-100 transition-colors"
          >
            <Upload size={14} /> Importa
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <Link
            href="/admin/projects/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo progetto
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Tipologia</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Paese</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="w-12 h-12 relative rounded overflow-hidden bg-warm-100">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="48px" />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-warm-100 text-warm-600 text-xs rounded">{p.type.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-6 py-4 text-warm-600">{p.country}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/projects/${p.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessun progetto trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
