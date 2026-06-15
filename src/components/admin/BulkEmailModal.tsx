"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, X, Send, AlertCircle, CheckCircle2, FileText, Edit3 } from "lucide-react";

interface TemplateOption { id: string; name: string; subject: string }

interface Props {
  open: boolean;
  onClose: () => void;
  /** Emails destinatari (deduplicate automaticamente lato backend) */
  emails: string[];
  /** Label opzionale del contesto, es. "clienti", "professionisti" */
  contextLabel?: string;
}

type Mode = "template" | "simple";

/**
 * Modal per inviare un'email a N indirizzi. Due modalità:
 *  - **Template**: scegli un EmailTemplate (con auto-traduzione per lingua di
 *    ciascun destinatario).
 *  - **Semplice**: scrivi subject + corpo HTML/testo direttamente (utile per
 *    comunicazioni una tantum non template).
 * Backend: /api/admin/persone/bulk-email accetta entrambi i casi.
 */
export default function BulkEmailModal({ open, onClose, emails, contextLabel = "contatti" }: Props) {
  const [mode, setMode] = useState<Mode>("template");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; errors?: Array<{ email: string; error: string }> } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError("");
    setLoading(true);
    fetch("/api/admin/persone/bulk-email")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTemplates(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const send = async () => {
    if (mode === "template" && !templateId) { setError("Scegli un template"); return; }
    if (mode === "simple" && (!subject.trim() || !body.trim())) { setError("Inserisci oggetto e corpo"); return; }
    if (!emails.length) { setError("Nessun destinatario"); return; }
    setSending(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { emails };
      if (mode === "template") payload.templateId = templateId;
      else {
        payload.subject = subject;
        // Wrappa il body in un HTML basico se non ha già tag struttura
        const html = /<html|<body/i.test(body)
          ? body
          : `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f4f2;font-family:Arial,Helvetica,sans-serif;color:#2d2b27;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f2;padding:32px 0;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;max-width:560px;width:100%;border:1px solid #e8e6e3;padding:32px;font-size:15px;line-height:1.6;color:#2d2b27;"><tr><td>${body.replace(/\n/g, "<br>")}</td></tr></table></td></tr></table></body></html>`;
        payload.html = html;
      }
      const res = await fetch("/api/admin/persone/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Errore");
      }
    } catch { setError("Errore di rete"); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-warm-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-warm-900">
            <Mail size={16} />
            <h2 className="font-semibold">Invia email a {emails.length} {contextLabel}</h2>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-900"><X size={18} /></button>
        </div>

        <div className="p-5 flex-1 overflow-auto">
          {result ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-4 rounded-lg ${result.failed === 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                {result.failed === 0 ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <div>
                  <div className="font-medium">Invio completato</div>
                  <div className="text-sm">
                    <strong>{result.sent}</strong> inviate · <strong>{result.failed}</strong> fallite · {result.total} totali
                  </div>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs text-warm-600 bg-warm-50 border border-warm-200 rounded p-3 max-h-40 overflow-y-auto">
                  <div className="font-medium text-warm-700 mb-1">Errori (prime {result.errors.length}):</div>
                  {result.errors.map((e, i) => (
                    <div key={i} className="font-mono text-[11px]">{e.email}: {e.error}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Toggle modalità */}
              <div className="flex gap-1 mb-4 bg-warm-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode("template")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                    mode === "template" ? "bg-white text-warm-900 shadow-sm" : "text-warm-600 hover:text-warm-900"
                  }`}
                >
                  <FileText size={12} /> Template
                </button>
                <button
                  type="button"
                  onClick={() => setMode("simple")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                    mode === "simple" ? "bg-white text-warm-900 shadow-sm" : "text-warm-600 hover:text-warm-900"
                  }`}
                >
                  <Edit3 size={12} /> Email semplice
                </button>
              </div>

              {mode === "template" ? (
                <>
                  <p className="text-sm text-warm-600 mb-3">
                    Ogni destinatario riceverà la versione del template nella sua lingua preferita
                    (se la traduzione esiste; altrimenti italiano).
                  </p>
                  {loading ? (
                    <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-warm-400" /></div>
                  ) : templates.length === 0 ? (
                    <div className="text-sm text-warm-500 italic">Nessun template attivo. Crea un template da Marketing → Email.</div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-warm-600 mb-2">Template</label>
                      <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-warm-300 rounded text-sm bg-white focus:border-warm-800 focus:outline-none"
                      >
                        <option value="">— Scegli template —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {templateId && (
                        <div className="mt-2 text-xs text-warm-500">
                          Oggetto: <strong>{templates.find((t) => t.id === templateId)?.subject}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-warm-600 mb-3">
                    Scrivi un&apos;email una tantum. Puoi usare le variabili <code className="bg-warm-100 px-1 rounded text-[11px]">{"{{firstName}}"}</code>,
                    <code className="bg-warm-100 px-1 rounded text-[11px] ml-1">{"{{lastName}}"}</code>,
                    <code className="bg-warm-100 px-1 rounded text-[11px] ml-1">{"{{email}}"}</code>.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-warm-600 mb-1.5">Oggetto</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Es. Aggiornamento importante per te {{firstName}}"
                        className="w-full px-3 py-2.5 border border-warm-300 rounded text-sm focus:border-warm-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-warm-600 mb-1.5">Corpo del messaggio</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        placeholder="Ciao {{firstName}},\n\nti scriviamo per...&#10;&#10;Cordiali saluti,\nIl team GTV"
                        className="w-full px-3 py-2.5 border border-warm-300 rounded text-sm focus:border-warm-800 focus:outline-none font-mono"
                      />
                      <div className="text-[10px] text-warm-400 mt-1">
                        Puoi usare HTML basico (&lt;b&gt;, &lt;a href&gt;, &lt;br&gt;). Le interruzioni di riga vengono convertite automaticamente.
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-warm-200 flex justify-end gap-2 bg-warm-50/50">
          {result ? (
            <button onClick={onClose} className="px-4 py-2 text-sm bg-warm-900 text-white rounded hover:bg-warm-800">
              Chiudi
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-warm-700 hover:bg-warm-100 rounded">Annulla</button>
              <button
                onClick={send}
                disabled={sending || (mode === "template" && (!templateId || templates.length === 0))}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-warm-900 text-white rounded hover:bg-warm-800 disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? "Invio…" : `Invia ora a ${emails.length}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
