"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, QrCode, Globe, Trash2, Users, Eye } from "lucide-react";

interface LandingPage {
  id: string;
  name: string;
  permalink: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { registrations: number };
}

const TYPE_LABELS: Record<string, string> = {
  evento: "Evento",
  promo: "Promozionale",
  custom: "Personalizzata",
};

const TYPE_COLORS: Record<string, string> = {
  evento: "bg-purple-100 text-purple-700",
  promo: "bg-blue-100 text-blue-700",
  custom: "bg-warm-100 text-warm-700",
};

export default function LandingPagesListPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPermalink, setNewPermalink] = useState("");
  const [newType, setNewType] = useState("evento");
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/landing-page-config?admin=true");
      const d = await r.json();
      if (d.success) setPages(d.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newPermalink.trim()) { alert("Nome e permalink obbligatori"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/landing-page-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, permalink: newPermalink, type: newType }),
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setNewName(""); setNewPermalink(""); fetchPages(); }
      else alert(d.error);
    } catch { alert("Errore"); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questa landing page e tutte le registrazioni collegate?")) return;
    await fetch(`/api/landing-page-config?id=${id}`, { method: "DELETE" });
    fetchPages();
  };

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Landing Pages</h1>
          <p className="text-sm text-warm-500 mt-1">Gestisci le tue landing page per eventi, promozioni e altro</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors">
          <Plus size={16} /> Nuova Landing Page
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>
      ) : pages.length === 0 ? (
        <div className="text-center py-20 text-warm-500">
          <Globe size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nessuna landing page creata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((lp) => (
            <div key={lp.id} className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Link href={`/admin/landing-page/${lp.id}`} className="font-semibold text-warm-900 hover:text-warm-700 transition-colors text-lg">
                    {lp.name}
                  </Link>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[lp.type] || TYPE_COLORS.custom}`}>
                    {TYPE_LABELS[lp.type] || lp.type}
                  </span>
                  {!lp.isActive && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inattiva</span>}
                </div>
                <div className="flex items-center gap-4 text-xs text-warm-500">
                  <span className="font-mono">/{lp.permalink}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {lp._count.registrations} registrazioni</span>
                  <span>{new Date(lp.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={`/${lp.permalink}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-warm-600 bg-warm-100 rounded-lg hover:bg-warm-200 transition-colors">
                  <Eye size={14} /> Anteprima
                </a>
                <Link href={`/admin/landing-page/${lp.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-warm-800 rounded-lg hover:bg-warm-900 transition-colors">
                  <QrCode size={14} /> Gestisci
                </Link>
                <button onClick={() => handleDelete(lp.id)}
                  className="p-2 text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">Nuova Landing Page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome</label>
                <input type="text" value={newName} onChange={(e) => { setNewName(e.target.value); setNewPermalink(e.target.value.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")); }}
                  placeholder="Es. Milan Design Week 2026" className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Permalink</label>
                <div className="flex items-center gap-0 border border-warm-300 rounded-lg overflow-hidden">
                  <span className="bg-warm-50 px-3 py-2.5 text-xs text-warm-500 border-r border-warm-300 shrink-0">{siteUrl}/</span>
                  <input type="text" value={newPermalink} onChange={(e) => setNewPermalink(e.target.value.toLowerCase().replace(/[^\w-]/g, ""))}
                    className="flex-1 px-3 py-2.5 text-sm font-mono focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Tipo</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                  <option value="evento">Evento (con QR code e check-in)</option>
                  <option value="promo">Promozionale</option>
                  <option value="custom">Personalizzata</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-warm-600">Annulla</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-2 bg-warm-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
                {creating ? "Creazione..." : "Crea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
