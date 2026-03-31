"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import EmailBlockEditor, { type EmailBlock } from "@/components/admin/email-template/EmailBlockEditor";

const VARIABLES = ["{{firstName}}", "{{lastName}}", "{{email}}", "{{eventLink}}"];

function cleanBlocks(blocks: EmailBlock[]) {
  const clean: Record<string, unknown>[] = [];
  for (const b of blocks) {
    const entry: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(b)) { if (k !== "id") entry[k] = v; }
    clean.push(entry);
  }
  return clean;
}

let blockCounter = 0;
function newId() { return `blk_${++blockCounter}_${Date.now()}`; }

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    fetch(`/api/email-templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setName(data.data.name);
          setSubject(data.data.subject);
          try {
            const parsed = JSON.parse(data.data.blocks);
            setBlocks(parsed.map((b: EmailBlock) => ({ ...b, id: b.id || newId() })));
          } catch { setBlocks([]); }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) { alert("Inserisci un nome per il template"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, blocks: cleanBlocks(blocks) }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || "Errore");
    } catch { alert("Errore di connessione"); }
    setSaving(false);
  };

  const handlePreview = async () => {
    try {
      const res = await fetch("/api/email-templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: cleanBlocks(blocks) }),
      });
      const data = await res.json();
      if (data.success) { setPreviewHtml(data.html); setShowPreview(true); }
    } catch { /* */ }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/email-templates")} className="text-warm-400 hover:text-warm-600 transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-warm-900">Modifica Template</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview} className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
            <Eye size={14} /> Anteprima
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome template</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Invito Salone 2026"
            className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto email</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Es. Sei invitato al nostro evento"
            className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
          <div className="flex gap-1 mt-2 flex-wrap">
            {VARIABLES.map((v) => (
              <button key={v} onClick={() => setSubject(subject + " " + v)} type="button"
                className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors font-mono">{v}</button>
            ))}
          </div>
        </div>
      </div>

      <EmailBlockEditor blocks={blocks} onChange={setBlocks} />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-warm-200 shrink-0">
              <h2 className="text-lg font-semibold text-warm-900">Anteprima Email</h2>
              <button onClick={() => setShowPreview(false)} className="text-warm-400 hover:text-warm-600 text-xl">&times;</button>
            </div>
            <div className="flex-1 overflow-auto bg-warm-100 p-4">
              <iframe srcDoc={previewHtml} className="w-full min-h-[600px] bg-white rounded-lg shadow" title="Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
