"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Download, Trash2, Shield, Bell, Send, Filter, X, Mail } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  acceptsPrivacy: boolean;
  acceptsUpdates: boolean;
  createdAt: string;
}

type FilterType = "all" | "privacy" | "updates" | "both";

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCompose, setShowCompose] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const data = await res.json();
      setSubscribers(data.data || []);
    } catch {
      console.error("Failed to fetch subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "privacy":
        return subscribers.filter((s) => s.acceptsPrivacy);
      case "updates":
        return subscribers.filter((s) => s.acceptsUpdates);
      case "both":
        return subscribers.filter((s) => s.acceptsPrivacy && s.acceptsUpdates);
      default:
        return subscribers;
    }
  }, [subscribers, filter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  };

  const toggleField = async (id: string, field: "acceptsPrivacy" | "acceptsUpdates", current: boolean) => {
    try {
      const subscriber = subscribers.find((s) => s.id === id);
      if (!subscriber) return;

      const res = await fetch(`/api/newsletter/subscribers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptsPrivacy: field === "acceptsPrivacy" ? !current : subscriber.acceptsPrivacy,
          acceptsUpdates: field === "acceptsUpdates" ? !current : subscriber.acceptsUpdates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, [field]: !current } : s))
        );
      }
    } catch {
      console.error("Failed to update subscriber");
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo iscritto?")) return;
    try {
      const res = await fetch(`/api/newsletter/subscribers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      console.error("Failed to delete subscriber");
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Eliminare ${selected.size} iscritt${selected.size === 1 ? "o" : "i"}?`)) return;
    try {
      const res = await fetch("/api/newsletter/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers((prev) => prev.filter((s) => !selected.has(s.id)));
        setSelected(new Set());
      }
    } catch {
      console.error("Failed to delete selected");
    }
  };

  const openCompose = (singleEmail?: string) => {
    if (singleEmail) {
      const sub = subscribers.find((s) => s.email === singleEmail);
      if (sub) setSelected(new Set([sub.id]));
    }
    setShowCompose(true);
    setSendResult(null);
    setEmailSubject("");
    setEmailBody("");
  };

  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert("Compila oggetto e corpo dell'email");
      return;
    }
    if (selected.size === 0) {
      alert("Seleziona almeno un destinatario");
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${emailBody.replace(/\n/g, "<br>")}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 15px;" />
          <p style="color: #999; font-size: 11px;">Gebrüder Thonet Vienna</p>
        </div>
      `;

      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriberIds: Array.from(selected),
          subject: emailSubject,
          html,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSendResult(data.data);
      } else {
        alert(data.error || "Errore nell'invio");
      }
    } catch {
      alert("Errore di connessione");
    } finally {
      setSending(false);
    }
  };

  const exportCSV = () => {
    const toExport = selected.size > 0
      ? subscribers.filter((s) => selected.has(s.id))
      : filtered;
    if (toExport.length === 0) return;
    const headers = ["Email", "Privacy", "Aggiornamenti", "Data Iscrizione"];
    const rows = toExport.map((s) => [
      `"${s.email}"`,
      s.acceptsPrivacy ? "Si" : "No",
      s.acceptsUpdates ? "Si" : "No",
      new Date(s.createdAt).toLocaleDateString("it-IT"),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `newsletter_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const privacyCount = subscribers.filter((s) => s.acceptsPrivacy).length;
  const updatesCount = subscribers.filter((s) => s.acceptsUpdates).length;

  const filterLabels: Record<FilterType, string> = {
    all: "Tutti",
    privacy: "Solo Privacy",
    updates: "Solo Aggiornamenti",
    both: "Privacy + Aggiornamenti",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Newsletter</h1>
          <p className="text-sm text-warm-500 mt-1">
            {subscribers.length} iscritt{subscribers.length === 1 ? "o" : "i"} &middot;{" "}
            {privacyCount} privacy &middot; {updatesCount} aggiornamenti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={subscribers.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm text-warm-600 border border-warm-300 rounded hover:bg-warm-50 transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            CSV
          </button>
          <button
            onClick={() => openCompose()}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-warm-800 text-white text-sm rounded hover:bg-warm-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={15} />
            Invia email ({selected.size})
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={15} className="text-warm-400" />
        {(Object.keys(filterLabels) as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelected(new Set()); }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filter === f
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            }`}
          >
            {filterLabels[f]}
            {f !== "all" && (
              <span className="ml-1 opacity-70">
                ({f === "privacy" ? privacyCount : f === "updates" ? updatesCount : subscribers.filter((s) => s.acceptsPrivacy && s.acceptsUpdates).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Selection actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-blue-700 font-medium">
            {selected.size} selezionat{selected.size === 1 ? "o" : "i"}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => openCompose()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
          >
            <Send size={13} />
            Invia email
          </button>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
          >
            <Trash2 size={13} />
            Elimina
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1 text-warm-400 hover:text-warm-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-warm-200">
              <div>
                <h2 className="text-lg font-semibold text-warm-800">Componi Email</h2>
                <p className="text-xs text-warm-500 mt-0.5">
                  {selected.size} destinatar{selected.size === 1 ? "io" : "i"} selezionat{selected.size === 1 ? "o" : "i"}
                </p>
              </div>
              <button onClick={() => setShowCompose(false)} className="p-1 text-warm-400 hover:text-warm-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Recipients preview */}
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Destinatari
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {subscribers
                    .filter((s) => selected.has(s.id))
                    .map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-warm-100 text-warm-700 text-xs rounded">
                        <Mail size={11} />
                        {s.email}
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Oggetto *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  placeholder="Oggetto dell'email..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
                  Corpo *
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800"
                  placeholder="Scrivi il contenuto dell'email..."
                />
                <p className="text-xs text-warm-400 mt-1">Il testo viene inviato come email HTML. Usa righe vuote per separare i paragrafi.</p>
              </div>

              {sendResult && (
                <div className={`px-4 py-3 rounded text-sm ${
                  sendResult.failed === 0
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                }`}>
                  Inviate: {sendResult.sent} &middot; Fallite: {sendResult.failed}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-warm-200">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm text-warm-600 border border-warm-300 rounded hover:bg-warm-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={sendEmail}
                disabled={sending || !emailSubject.trim() || !emailBody.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-warm-800 text-white text-sm rounded hover:bg-warm-900 disabled:opacity-50 transition-colors"
              >
                <Send size={15} />
                {sending ? "Invio in corso..." : `Invia a ${selected.size} destinatar${selected.size === 1 ? "io" : "i"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-warm-400">
          {filter === "all" ? "Nessun iscritto alla newsletter" : "Nessun iscritto con questo filtro"}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={selectAll}
                    className="rounded border-warm-300"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Email</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <Shield size={13} />
                    Privacy
                  </div>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <Bell size={13} />
                    Aggiornamenti
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Data</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-warm-100 transition-colors ${
                    selected.has(s.id) ? "bg-blue-50/50" : "hover:bg-warm-50/50"
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-warm-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-warm-800 font-medium">{s.email}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(s.id, "acceptsPrivacy", s.acceptsPrivacy)}
                      className={`w-8 h-5 rounded-full relative transition-colors ${
                        s.acceptsPrivacy ? "bg-green-500" : "bg-warm-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          s.acceptsPrivacy ? "left-3.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleField(s.id, "acceptsUpdates", s.acceptsUpdates)}
                      className={`w-8 h-5 rounded-full relative transition-colors ${
                        s.acceptsUpdates ? "bg-green-500" : "bg-warm-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          s.acceptsUpdates ? "left-3.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-warm-500 text-xs">
                    {new Date(s.createdAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openCompose(s.email)}
                        className="p-1.5 text-warm-400 hover:text-blue-500 rounded transition-colors"
                        title="Invia email"
                      >
                        <Mail size={15} />
                      </button>
                      <button
                        onClick={() => deleteSubscriber(s.id)}
                        className="p-1.5 text-warm-400 hover:text-red-500 rounded transition-colors"
                        title="Elimina iscritto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
