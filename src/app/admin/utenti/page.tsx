"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Newspaper,
  QrCode,
  Users,
  Send,
  X,
  Filter,
  Mail,
} from "lucide-react";

type Tab = "newsletter" | "event";
type EventFilter = "all" | "participated" | "not_participated";

interface NewsletterSub {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  acceptsPrivacy: boolean;
  acceptsUpdates: boolean;
  createdAt: string;
}

interface EventReg {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profile: string | null;
  country: string;
  city: string;
  qrCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

export default function AdminUtentiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("newsletter");
  const [search, setSearch] = useState("");

  // Newsletter
  const [nlSubs, setNlSubs] = useState<NewsletterSub[]>([]);
  const [nlLoading, setNlLoading] = useState(true);
  const [nlSelected, setNlSelected] = useState<Set<string>>(new Set());

  // Email compose
  const [showCompose, setShowCompose] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // Event registrations
  const [eventRegs, setEventRegs] = useState<EventReg[]>([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  const fetchNewsletter = useCallback(async () => {
    setNlLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const data = await res.json();
      if (data.success) setNlSubs(data.data || []);
    } catch { /* */ }
    setNlLoading(false);
  }, []);

  const fetchEventRegs = useCallback(async () => {
    setEventLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/event-registrations?${params}`);
      const data = await res.json();
      if (data.success) setEventRegs(data.data);
    } catch { /* */ }
    setEventLoading(false);
  }, [search]);

  useEffect(() => {
    fetchNewsletter();
    fetchEventRegs();
  }, [fetchNewsletter, fetchEventRegs]);

  // Newsletter filtered by search
  const filteredNl = useMemo(() => {
    if (!search) return nlSubs;
    const q = search.toLowerCase();
    return nlSubs.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.firstName || "").toLowerCase().includes(q) ||
        (s.lastName || "").toLowerCase().includes(q)
    );
  }, [nlSubs, search]);

  // Event filtered by participation
  const filteredEvent = useMemo(() => {
    let list = eventRegs;
    if (eventFilter === "participated") list = list.filter((r) => r.checkedIn);
    if (eventFilter === "not_participated") list = list.filter((r) => !r.checkedIn);
    return list;
  }, [eventRegs, eventFilter]);

  // Newsletter selection
  const toggleNlSelect = (id: string) => {
    setNlSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllNl = () => {
    if (nlSelected.size === filteredNl.length) setNlSelected(new Set());
    else setNlSelected(new Set(filteredNl.map((s) => s.id)));
  };

  const handleDeleteNl = async (id: string) => {
    if (!confirm("Eliminare questo iscritto?")) return;
    try {
      const res = await fetch(`/api/newsletter/subscribers/${id}`, { method: "DELETE" });
      if ((await res.json()).success) {
        setNlSubs((prev) => prev.filter((s) => s.id !== id));
        setNlSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    } catch { /* */ }
  };

  const handleDeleteSelectedNl = async () => {
    if (nlSelected.size === 0) return;
    if (!confirm(`Eliminare ${nlSelected.size} iscritti?`)) return;
    try {
      const res = await fetch("/api/newsletter/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(nlSelected) }),
      });
      if ((await res.json()).success) {
        setNlSubs((prev) => prev.filter((s) => !nlSelected.has(s.id)));
        setNlSelected(new Set());
      }
    } catch { /* */ }
  };

  // Send email
  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { alert("Compila oggetto e corpo dell'email"); return; }
    if (nlSelected.size === 0) { alert("Seleziona almeno un destinatario"); return; }
    setSending(true);
    setSendResult(null);
    try {
      const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${emailBody.replace(/\n/g, "<br>")}<hr style="border:none;border-top:1px solid #eee;margin:30px 0 15px;"/><p style="color:#999;font-size:11px;">Gebrüder Thonet Vienna</p></div>`;
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberIds: Array.from(nlSelected), subject: emailSubject, html }),
      });
      const data = await res.json();
      if (data.success) setSendResult(data.data);
      else alert(data.error || "Errore nell'invio");
    } catch { alert("Errore di connessione"); }
    setSending(false);
  };

  // Event actions
  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    try {
      const res = await fetch(`/api/event-registrations/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn }),
      });
      if ((await res.json()).success) fetchEventRegs();
    } catch { /* */ }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Eliminare questa registrazione?")) return;
    try {
      const res = await fetch(`/api/event-registrations/${id}`, { method: "DELETE" });
      if ((await res.json()).success) fetchEventRegs();
    } catch { /* */ }
  };

  const checkedInCount = eventRegs.filter((r) => r.checkedIn).length;
  const loading = activeTab === "newsletter" ? nlLoading : eventLoading;

  const TABS: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: "newsletter", label: "Newsletter", icon: Newspaper, count: nlSubs.length },
    { key: "event", label: "Evento", icon: QrCode, count: eventRegs.length },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Utenti</h1>
          <p className="text-sm text-warm-500 mt-1">
            {nlSubs.length} newsletter &middot; {eventRegs.length} registrazioni evento ({checkedInCount} partecipanti)
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "newsletter" && nlSelected.size > 0 && (
            <>
              <button onClick={() => { setShowCompose(true); setSendResult(null); setEmailSubject(""); setEmailBody(""); }}
                className="flex items-center gap-2 bg-warm-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors">
                <Send size={14} /> Invia email ({nlSelected.size})
              </button>
              <button onClick={handleDeleteSelectedNl}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                <Trash2 size={14} /> Elimina ({nlSelected.size})
              </button>
            </>
          )}
          {activeTab === "event" && (
            <button onClick={() => window.open("/api/event-registrations?format=csv", "_blank")}
              className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
              <Download size={16} /> Esporta CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key ? "border-warm-800 text-warm-900" : "border-transparent text-warm-400 hover:text-warm-600"
            }`}>
            <tab.icon size={16} />
            {tab.label}
            <span className="ml-1 bg-warm-100 text-warm-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Event filter */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email..."
            className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none" />
        </div>
        {activeTab === "event" && (
          <div className="flex gap-1">
            {(["all", "participated", "not_participated"] as EventFilter[]).map((f) => (
              <button key={f} onClick={() => setEventFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  eventFilter === f ? "bg-warm-800 text-white" : "bg-warm-100 text-warm-600 hover:bg-warm-200"
                }`}>
                <Filter size={12} className="inline mr-1" />
                {f === "all" ? "Tutti" : f === "participated" ? "Partecipati" : "Non partecipati"}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ═══ Newsletter Tab ═══ */}
          {activeTab === "newsletter" && (
            filteredNl.length === 0 ? (
              <div className="text-center py-20 text-warm-500">
                <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nessun iscritto alla newsletter</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-200 bg-warm-50">
                      <th className="text-left px-4 py-3 w-10">
                        <input type="checkbox" checked={nlSelected.size === filteredNl.length && filteredNl.length > 0}
                          onChange={selectAllNl} className="accent-warm-800" />
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Nome</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">Azienda</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                      <th className="text-right px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {filteredNl.map((s) => (
                      <tr key={s.id} className={`hover:bg-warm-50/50 transition-colors ${nlSelected.has(s.id) ? "bg-warm-50" : ""}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={nlSelected.has(s.id)} onChange={() => toggleNlSelect(s.id)} className="accent-warm-800" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-warm-800">{s.firstName || ""} {s.lastName || ""}</div>
                        </td>
                        <td className="px-4 py-3 text-warm-600">{s.email}</td>
                        <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">{s.company || "—"}</td>
                        <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">
                          {new Date(s.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          <button onClick={() => { setNlSelected(new Set([s.id])); setShowCompose(true); setSendResult(null); setEmailSubject(""); setEmailBody(""); }}
                            className="text-warm-400 hover:text-warm-600 transition-colors" title="Invia email">
                            <Mail size={16} />
                          </button>
                          <button onClick={() => handleDeleteNl(s.id)} className="text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ═══ Event Tab ═══ */}
          {activeTab === "event" && (
            filteredEvent.length === 0 ? (
              <div className="text-center py-20 text-warm-500">
                <QrCode size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nessuna registrazione trovata</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-200 bg-warm-50">
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Nome</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">Profilo</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden lg:table-cell">Luogo</th>
                      <th className="text-center px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Partecipato</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                      <th className="text-right px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {filteredEvent.map((r) => (
                      <tr key={r.id} className="hover:bg-warm-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-warm-800">{r.firstName} {r.lastName}</div>
                          <div className="text-[10px] text-warm-400 font-mono mt-0.5">{r.qrCode.slice(0, 8)}...</div>
                        </td>
                        <td className="px-4 py-3 text-warm-600">{r.email}</td>
                        <td className="px-4 py-3 text-warm-600 hidden md:table-cell">
                          {r.profile ? <span className="inline-block text-[10px] font-medium bg-warm-100 text-warm-600 px-2 py-0.5 rounded">{r.profile}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-warm-600 hidden lg:table-cell">{r.city}, {r.country}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleCheckIn(r.id, !r.checkedIn)} title={r.checkedIn ? "Annulla" : "Segna partecipato"}>
                            {r.checkedIn ? <CheckCircle2 size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-warm-300 hover:text-warm-500 mx-auto transition-colors" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">
                          {new Date(r.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteEvent(r.id)} className="text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* ═══ Compose Email Modal ═══ */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCompose(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-warm-900">Invia Email</h2>
              <button onClick={() => setShowCompose(false)} className="text-warm-400 hover:text-warm-600"><X size={20} /></button>
            </div>

            <p className="text-xs text-warm-500 mb-4">
              {nlSelected.size} destinatar{nlSelected.size === 1 ? "io" : "i"} selezionat{nlSelected.size === 1 ? "o" : "i"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto</label>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Messaggio</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8}
                  className="w-full border border-warm-300 rounded-lg px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
            </div>

            {sendResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Inviate: {sendResult.sent} &middot; Fallite: {sendResult.failed}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm text-warm-600 hover:text-warm-800">Annulla</button>
              <button onClick={sendEmail} disabled={sending}
                className="flex items-center gap-2 bg-warm-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
                {sending ? "Invio..." : <><Send size={14} /> Invia</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
