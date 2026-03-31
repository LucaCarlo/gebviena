"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText, Eye, Copy } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-templates");
      const data = await res.json();
      if (data.success) setTemplates(data.data || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo template?")) return;
    await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    const res = await fetch(`/api/email-templates/${t.id}`);
    const data = await res.json();
    if (!data.success) return;
    await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${t.name} (copia)`, subject: t.subject, blocks: data.data.blocks }),
    });
    fetchTemplates();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Template Email</h1>
          <p className="text-sm text-warm-500 mt-1">Crea e gestisci template per newsletter e inviti</p>
        </div>
        <Link href="/admin/email-templates/new"
          className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors">
          <Plus size={16} /> Nuovo Template
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-warm-500">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nessun template creato</p>
          <Link href="/admin/email-templates/new" className="inline-block mt-4 text-sm text-warm-700 underline hover:text-warm-900">
            Crea il primo template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden group">
              {/* Preview thumbnail */}
              <Link href={`/admin/email-templates/${t.id}`} className="block">
                <div className="h-40 bg-warm-50 border-b border-warm-200 overflow-hidden relative">
                  <iframe
                    srcDoc={`<style>body{margin:0;transform:scale(0.35);transform-origin:top left;width:286%;pointer-events:none;}</style><div id="c"></div><script>fetch('/api/email-templates/${t.id}/preview').then(r=>r.text()).then(h=>document.getElementById('c').innerHTML=h)</script>`}
                    className="w-full h-[460px] pointer-events-none"
                    sandbox="allow-scripts allow-same-origin"
                    title={t.name}
                  />
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/admin/email-templates/${t.id}`} className="block">
                  <h3 className="font-semibold text-warm-900 text-sm group-hover:text-warm-700 transition-colors">{t.name}</h3>
                  <p className="text-xs text-warm-500 mt-1 truncate">{t.subject || "Nessun oggetto"}</p>
                </Link>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-warm-100">
                  <span className="text-[10px] text-warm-400">
                    {new Date(t.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <div className="flex gap-1">
                    <a href={`/api/email-templates/${t.id}/preview`} target="_blank"
                      className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors" title="Anteprima">
                      <Eye size={14} />
                    </a>
                    <button onClick={() => handleDuplicate(t)}
                      className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors" title="Duplica">
                      <Copy size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
