"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, LayoutGrid, Download, Upload } from "lucide-react";
import { HERO_PAGES } from "@/lib/constants";
import type { HeroSlide } from "@/types";

const PAGE_LABELS: Record<string, string> = Object.fromEntries(
  HERO_PAGES.map((p) => [p.value, p.label])
);

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const importRef = useRef<HTMLInputElement>(null);

  const fetchSlides = () => {
    const params = new URLSearchParams({ all: "1" });
    if (activeTab !== "all") params.set("page", activeTab);
    fetch(`/api/hero-slides?${params}`)
      .then((r) => r.json())
      .then((data) => { setSlides(data.data || []); setLoading(false); });
  };

  useEffect(() => { fetchSlides(); }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo slide?")) return;
    await fetch(`/api/hero-slides/${id}`, { method: "DELETE" });
    fetchSlides();
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export/hero-slides");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hero-slides.json";
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
      const res = await fetch("/api/import/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Importati ${data.count ?? 0} elementi`);
        fetchSlides();
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
        <h1 className="text-2xl font-semibold text-warm-800">Hero Slides</h1>
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
            href="/admin/hero/new"
            className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            <Plus size={16} /> Nuovo slide
          </Link>
        </div>
      </div>

      {/* Page filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <LayoutGrid size={16} className="text-warm-400 mr-1" />
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-warm-800 text-white"
              : "bg-warm-100 text-warm-600 hover:bg-warm-200"
          }`}
        >
          Tutti
        </button>
        {HERO_PAGES.map((p) => (
          <button
            key={p.value}
            onClick={() => setActiveTab(p.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === p.value
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Immagine</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Titolo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Pagina</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Posizione</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Attivo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Ordine</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {slides.map((s) => (
                <tr key={s.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="w-16 h-10 relative rounded overflow-hidden bg-warm-100">
                      {s.imageUrl ? (
                        <Image src={s.imageUrl} alt={s.title} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400 text-xs">N/A</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-warm-800">{s.title}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-warm-100 text-warm-700">
                      {PAGE_LABELS[s.page] || s.page}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-warm-600 capitalize">{s.position}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.isActive ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="px-6 py-4 text-warm-600">{s.sortOrder}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/hero/${s.id}`} className="p-1.5 text-warm-400 hover:text-warm-800 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-warm-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {slides.length === 0 && (
            <div className="text-center py-12 text-warm-400">Nessuno slide trovato</div>
          )}
        </div>
      )}
    </div>
  );
}
