"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, MailOpen, Check, Download, Newspaper, Trash2, Reply, X, Send, Loader2 } from "lucide-react";
import type { ContactSubmission } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  info: "Informazioni",
  collaboration: "Collaborazione",
  store_contact: "Rete Vendita",
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [newsletterEmails, setNewsletterEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Reply modal state
  const [replyTo, setReplyTo] = useState<ContactSubmission | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      setContacts(data.data || []);
    } catch {
      console.error("Failed to fetch contacts");
    }
  }, []);

  const fetchNewsletterEmails = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const data = await res.json();
      if (data.success && data.data) {
        setNewsletterEmails(new Set(data.data.map((s: { email: string }) => s.email)));
      }
    } catch {
      // Newsletter endpoint may not exist yet; ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchContacts(), fetchNewsletterEmails()]).then(() => setLoading(false));
  }, [fetchContacts, fetchNewsletterEmails]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isRead: true } : c))
        );
      }
    } catch {
      console.error("Failed to mark as read");
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo messaggio?")) return;
    try {
      const res = await fetch(`/api/contact/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      console.error("Failed to delete contact");
    }
  };

  const exportCSV = () => {
    if (contacts.length === 0) return;

    const headers = ["Nome", "Email", "Azienda", "Telefono", "Motivo", "Oggetto", "Messaggio", "Tipo", "Letto", "Data"];
    const rows = contacts.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${c.phone || ""}"`,
      `"${(c.contactReason || "").replace(/"/g, '""')}"`,
      `"${(c.subject || "").replace(/"/g, '""')}"`,
      `"${c.message.replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${TYPE_LABELS[c.type] || c.type}"`,
      c.isRead ? "Si" : "No",
      new Date(c.createdAt).toLocaleDateString("it-IT"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contatti_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openReply = (c: ContactSubmission) => {
    setReplyTo(c);
    setReplySubject(c.subject ? `Re: ${c.subject}` : "Re: La tua richiesta");
    setReplyBody("");
    setSendResult(null);
  };

  const closeReply = () => {
    setReplyTo(null);
    setReplySubject("");
    setReplyBody("");
    setSending(false);
    setSendResult(null);
  };

  const handleSendReply = async () => {
    if (!replyTo || !replySubject.trim() || !replyBody.trim()) return;
    setSending(true);
    setSendResult(null);

    try {
      const originalQuote = `<br/><br/><hr/><p style="color:#888;font-size:12px;">Messaggio originale da ${replyTo.name} (${replyTo.email}):</p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#666;">${replyTo.message.replace(/\n/g, "<br/>")}</blockquote>`;
      const html = `<div>${replyBody.replace(/\n/g, "<br/>")}</div>${originalQuote}`;

      const res = await fetch("/api/contact/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo.email,
          subject: replySubject,
          html,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSendResult({ ok: true, msg: "Email inviata con successo!" });
        // Auto-mark as read
        if (!replyTo.isRead) {
          markAsRead(replyTo.id);
        }
        setTimeout(closeReply, 1500);
      } else {
        setSendResult({ ok: false, msg: data.error || "Errore durante l'invio" });
      }
    } catch {
      setSendResult({ ok: false, msg: "Errore di rete" });
    } finally {
      setSending(false);
    }
  };

  const unreadCount = contacts.filter((c) => !c.isRead).length;
  const filteredContacts = typeFilter === "all" ? contacts : contacts.filter((c) => c.type === typeFilter);
  const types = Array.from(new Set(contacts.map((c) => c.type)));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Messaggi</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-warm-500 mt-1">
              {unreadCount} non lett{unreadCount === 1 ? "o" : "i"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-warm-300 rounded px-3 py-2 text-sm focus:border-warm-800 focus:outline-none"
          >
            <option value="all">Tutti i tipi</option>
            {types.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-warm-800 text-white text-sm rounded hover:bg-warm-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Esporta CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-warm-400">Nessun messaggio ricevuto</div>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl shadow-sm border p-6 ${
                c.isRead ? "border-warm-200" : "border-warm-400 bg-warm-50/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {c.isRead ? (
                    <MailOpen size={18} className="text-warm-400" />
                  ) : (
                    <Mail size={18} className="text-brand-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-warm-800">{c.name}</p>
                      {newsletterEmails.has(c.email) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                          <Newspaper size={10} />
                          Newsletter
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-warm-500">{c.email}</p>
                    {(c.company || c.phone) && (
                      <p className="text-xs text-warm-400">
                        {[c.company, c.phone].filter(Boolean).join(" — ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <span className={`px-2 py-1 text-xs rounded ${c.type === "store_contact" ? "bg-green-100 text-green-700" : "bg-warm-100 text-warm-600"}`}>{TYPE_LABELS[c.type] || c.type}</span>
                    <p className="text-xs text-warm-400 mt-1">
                      {new Date(c.createdAt).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => openReply(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    title="Rispondi via email"
                  >
                    <Reply size={14} />
                    Rispondi
                  </button>
                  {!c.isRead && (
                    <button
                      onClick={() => markAsRead(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-warm-700 bg-warm-100 rounded hover:bg-warm-200 transition-colors"
                      title="Segna come letto"
                    >
                      <Check size={14} />
                      Letto
                    </button>
                  )}
                  <button
                    onClick={() => deleteContact(c.id)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    title="Elimina messaggio"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {c.contactReason && (
                <p className="text-xs text-warm-500 mb-1">
                  <span className="font-medium">Motivo:</span> {c.contactReason}
                </p>
              )}
              {c.subject && <p className="text-sm font-medium text-warm-700 mb-2">{c.subject}</p>}
              <p className="text-sm text-warm-600 leading-relaxed">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold text-warm-800">Rispondi a {replyTo.name}</h3>
                <p className="text-xs text-warm-500 mt-0.5">{replyTo.email}</p>
              </div>
              <button
                onClick={closeReply}
                className="p-1.5 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Original message */}
            <div className="px-6 py-3 bg-warm-50 border-b">
              <p className="text-xs text-warm-500 mb-1">Messaggio originale:</p>
              <p className="text-xs text-warm-600 line-clamp-3">{replyTo.message}</p>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">Oggetto</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1">Messaggio</label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={8}
                  placeholder="Scrivi la tua risposta..."
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>

              {sendResult && (
                <div
                  className={`px-4 py-2 rounded-lg text-sm ${
                    sendResult.ok
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {sendResult.msg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button
                onClick={closeReply}
                className="px-4 py-2 text-sm text-warm-600 hover:text-warm-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSendReply}
                disabled={sending || !replySubject.trim() || !replyBody.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? "Invio in corso..." : "Invia risposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
