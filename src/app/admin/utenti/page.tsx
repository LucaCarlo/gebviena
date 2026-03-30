"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Newspaper,
  QrCode,
  Users,
} from "lucide-react";

type Tab = "all" | "newsletter" | "event";

interface NewsletterSub {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
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
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  // Newsletter
  const [nlSubs, setNlSubs] = useState<NewsletterSub[]>([]);
  const [nlLoading, setNlLoading] = useState(true);

  // Event registrations
  const [eventRegs, setEventRegs] = useState<EventReg[]>([]);
  const [eventLoading, setEventLoading] = useState(true);

  const fetchNewsletter = useCallback(async () => {
    setNlLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribers");
      const data = await res.json();
      if (data.success) setNlSubs(data.data);
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

  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    try {
      const res = await fetch(`/api/event-registrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  const handleDeleteNl = async (id: string) => {
    if (!confirm("Eliminare questo iscritto?")) return;
    try {
      const res = await fetch(`/api/newsletter/subscribers/${id}`, { method: "DELETE" });
      if ((await res.json()).success) fetchNewsletter();
    } catch { /* */ }
  };

  // Filter by search
  const filteredNl = nlSubs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.firstName || "").toLowerCase().includes(q) ||
      (s.lastName || "").toLowerCase().includes(q)
    );
  });

  const filteredEvent = eventRegs; // already filtered server-side

  const checkedInCount = eventRegs.filter((r) => r.checkedIn).length;
  const loading = nlLoading || eventLoading;

  const TABS: { key: Tab; label: string; icon: typeof Users; count: number }[] = [
    { key: "all", label: "Tutti", icon: Users, count: nlSubs.length + eventRegs.length },
    { key: "newsletter", label: "Newsletter", icon: Newspaper, count: nlSubs.length },
    { key: "event", label: "Evento", icon: QrCode, count: eventRegs.length },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Utenti</h1>
          <p className="text-sm text-warm-500 mt-1">
            {nlSubs.length} newsletter &middot; {eventRegs.length} registrazioni evento ({checkedInCount} check-in)
          </p>
        </div>
        <button
          onClick={() => window.open("/api/event-registrations?format=csv", "_blank")}
          className="flex items-center gap-2 bg-warm-100 text-warm-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
        >
          <Download size={16} /> Esporta CSV Evento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-warm-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-warm-800 text-warm-900"
                : "border-transparent text-warm-400 hover:text-warm-600"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            <span className="ml-1 bg-warm-100 text-warm-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, email..."
          className="w-full sm:w-96 pl-10 pr-4 py-2.5 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Newsletter table */}
          {(activeTab === "all" || activeTab === "newsletter") && filteredNl.length > 0 && (
            <div className="mb-8">
              {activeTab === "all" && (
                <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Newspaper size={14} /> Newsletter ({filteredNl.length})
                </h2>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-200 bg-warm-50">
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Nome</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                      <th className="text-right px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {filteredNl.map((s) => (
                      <tr key={s.id} className="hover:bg-warm-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-warm-800">{s.firstName || ""} {s.lastName || ""}</div>
                          {s.company && <div className="text-[10px] text-warm-400">{s.company}</div>}
                        </td>
                        <td className="px-4 py-3 text-warm-600">{s.email}</td>
                        <td className="px-4 py-3 text-warm-500 text-xs hidden md:table-cell">
                          {new Date(s.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteNl(s.id)} className="text-warm-400 hover:text-red-500 transition-colors" title="Elimina">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Event registrations table */}
          {(activeTab === "all" || activeTab === "event") && filteredEvent.length > 0 && (
            <div>
              {activeTab === "all" && (
                <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <QrCode size={14} /> Registrazioni Evento ({filteredEvent.length})
                </h2>
              )}
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
                          <button onClick={() => handleCheckIn(r.id, !r.checkedIn)} title={r.checkedIn ? "Annulla partecipazione" : "Segna come partecipato"}>
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
            </div>
          )}

          {/* Empty states */}
          {activeTab === "newsletter" && filteredNl.length === 0 && (
            <div className="text-center py-20 text-warm-500">
              <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessun iscritto alla newsletter</p>
            </div>
          )}
          {activeTab === "event" && filteredEvent.length === 0 && (
            <div className="text-center py-20 text-warm-500">
              <QrCode size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessuna registrazione evento</p>
            </div>
          )}
          {activeTab === "all" && filteredNl.length === 0 && filteredEvent.length === 0 && (
            <div className="text-center py-20 text-warm-500">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessun utente trovato</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
