"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import EmailBlockEditor, { type EmailBlock } from "@/components/admin/email-template/EmailBlockEditor";

const VARIABLES = ["{{firstName}}", "{{lastName}}", "{{email}}", "{{eventLink}}"];

function cleanBlocks(blocks: EmailBlock[]) {
  return blocks.map((b) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(b)) { if (k !== "id") clean[k] = v; }
    return clean;
  });
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { alert("Inserisci un nome per il template"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, blocks: cleanBlocks(blocks) }),
      });
      const data = await res.json();
      if (data.success) router.push(`/admin/email-templates/${data.data.id}`);
      else alert(data.error || "Errore");
    } catch { alert("Errore di connessione"); }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/email-templates")} className="text-warm-400 hover:text-warm-600 transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-warm-900">Nuovo Template</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-warm-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Salvataggio..." : "Salva"}
        </button>
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
    </div>
  );
}
