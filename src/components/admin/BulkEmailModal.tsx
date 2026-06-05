"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, X, Send, AlertCircle, CheckCircle2 } from "lucide-react";

interface TemplateOption { id: string; name: string; subject: string }

interface Props {
  open: boolean;
  onClose: () => void;
  /** Emails destinatari (deduplicate automaticamente lato backend) */
  emails: string[];
  /** Label opzionale del contesto, es. "clienti", "professionisti" */
  contextLabel?: string;
}

/**
 * Modal per inviare un template email a una lista di indirizzi qualsiasi.
 * Si appoggia a /api/admin/persone/bulk-email che deduce la lingua di ciascun
 * destinatario consultando Customer/Professional/NewsletterSubscriber.
 *
 * Riusabile da pagina Clienti, Professionisti, Utenti (quest'ultima oggi usa
 * un suo flusso più complesso con scheduling/landing — questo modal è la
 * versione "diretta" per i casi semplici).
 */
export default function BulkEmailModal({ open, onClose, emails, contextLabel = "contatti" }: Props) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
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
    if (!templateId) { setError("Scegli un template"); return; }
    if (!emails.length) { setError("Nessun destinatario"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/persone/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, templateId }),
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
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-sm text-warm-600 mb-4">
                Sceglia un template email. Ogni destinatario riceverà la versione nella sua lingua
                preferita (se la traduzione esiste; altrimenti viene usata la versione italiana).
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
                    className="w-full px-3 py-2.5 border border-warm-300 rounded-lg text-sm bg-white focus:border-warm-800 focus:outline-none"
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
                disabled={sending || !templateId || templates.length === 0}
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
