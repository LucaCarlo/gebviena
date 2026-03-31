"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, MousePointer, UserCheck, QrCode, Eye, Download,
  Search, Loader2, Send, ChevronDown,
} from "lucide-react";

/* ───── Types ───── */

interface GlobalStats {
  totalInvited: number; totalOpened: number; totalClicked: number;
  totalRegistered: number; totalCheckedIn: number;
  registeredFromInvite: number; registeredDirect: number;
  inviteToOpened: number; inviteToClicked: number; inviteToRegistered: number;
  registeredToCheckedIn: number; inviteToCheckedIn: number;
}

interface EventStats {
  landingPageId: string; name: string; permalink: string;
  invited: number; opened: number; clicked: number;
  registered: number; registeredFromInvite: number; checkedIn: number;
  inviteToOpened: number; inviteToRegistered: number; registeredToCheckedIn: number;
}

interface Timeline { within1h: number; within24h: number; within3d: number; within7d: number; after7d: number; }

interface StatusItem { email: string; name?: string; sentAt?: string; openedAt?: string | null; clickedAt?: string | null; registeredAt?: string; checkedInAt?: string | null; source?: string; landingPageName?: string; campaign?: string | null; }

interface LandingPage { id: string; name: string; permalink: string; }

interface AnalyticsData {
  global: GlobalStats; byEvent: EventStats[]; timeline: Timeline;
  statusList: { invitedNotRegistered: StatusItem[]; registeredNotCheckedIn: StatusItem[]; checkedIn: StatusItem[]; registeredWithoutInvite: StatusItem[]; };
  landingPages: LandingPage[];
}

/* ───── Component ───── */

export default function EmailAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLp, setSelectedLp] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState("invitedNotRegistered");
  const [statusSearch, setStatusSearch] = useState("");

  const fetchData = async (lpId?: string) => {
    setLoading(true);
    try {
      const url = lpId ? `/api/event-analytics?landingPageId=${lpId}` : "/api/event-analytics";
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(selectedLp || undefined); }, [selectedLp]);

  const g = data?.global;
  const tl = data?.timeline;

  const timelineTotal = tl ? tl.within1h + tl.within24h + tl.within3d + tl.within7d + tl.after7d : 0;

  const statusTabs = [
    { key: "invitedNotRegistered", label: "Invitati (non registrati)", count: data?.statusList.invitedNotRegistered.length || 0 },
    { key: "registeredNotCheckedIn", label: "Registrati (no check-in)", count: data?.statusList.registeredNotCheckedIn.length || 0 },
    { key: "checkedIn", label: "Partecipato", count: data?.statusList.checkedIn.length || 0 },
    { key: "registeredWithoutInvite", label: "Registrati senza invito", count: data?.statusList.registeredWithoutInvite.length || 0 },
  ];

  const currentStatusList = useMemo(() => {
    if (!data) return [];
    const list = data.statusList[activeStatusTab as keyof typeof data.statusList] || [];
    if (!statusSearch) return list;
    const q = statusSearch.toLowerCase();
    return list.filter((item) => item.email.toLowerCase().includes(q) || (item.name || "").toLowerCase().includes(q));
  }, [data, activeStatusTab, statusSearch]);

  const exportUrl = `/api/event-analytics/export?status=${activeStatusTab}${selectedLp ? `&landingPageId=${selectedLp}` : ""}`;

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-warm-900 mb-6">Analitiche Evento</h1>
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-warm-400" /></div>
      </div>
    );
  }

  if (!data || !g) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold text-warm-900 mb-6">Analitiche Evento</h1>
        <div className="text-center py-20 text-warm-400">Nessun dato disponibile</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Analitiche Evento</h1>
          <p className="text-sm text-warm-500 mt-1">Funnel completo: inviti, aperture, click, registrazioni, check-in</p>
        </div>
        <div className="relative">
          <select value={selectedLp} onChange={(e) => setSelectedLp(e.target.value)}
            className="appearance-none bg-white border border-warm-300 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:border-warm-800 focus:outline-none cursor-pointer">
            <option value="">Tutti gli eventi</option>
            {data.landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none" />
        </div>
      </div>

      {/* ═══ Funnel ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
        <h2 className="text-sm font-bold text-warm-600 uppercase tracking-wider mb-5 flex items-center gap-2"><BarChart3 size={15} /> Funnel</h2>
        <div className="space-y-3">
          <FunnelBar label="Invitati" count={g.totalInvited} max={g.totalInvited} color="bg-warm-300" icon={<Send size={14} />} />
          <FunnelBar label="Aperto email" count={g.totalOpened} max={g.totalInvited} color="bg-blue-400" icon={<Eye size={14} />} />
          <FunnelBar label="Cliccato link" count={g.totalClicked} max={g.totalInvited} color="bg-amber-400" icon={<MousePointer size={14} />} />
          <FunnelBar label="Registrati (da invito)" count={g.registeredFromInvite} max={g.totalInvited} color="bg-warm-600" icon={<UserCheck size={14} />} />
          <FunnelBar label="Check-in" count={g.totalCheckedIn} max={g.totalInvited} color="bg-warm-800" icon={<QrCode size={14} />} />
        </div>
        <div className="mt-4 pt-4 border-t border-warm-100 flex flex-wrap gap-4 text-xs text-warm-500">
          <span>Registrazioni totali: <b className="text-warm-700">{g.totalRegistered}</b></span>
          <span>Da invito: <b className="text-warm-700">{g.registeredFromInvite}</b></span>
          <span>Dirette: <b className="text-warm-700">{g.registeredDirect}</b></span>
        </div>
      </div>

      {/* ═══ Conversion rates ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Invito → Apertura" value={g.inviteToOpened} icon={<Eye size={16} />} />
        <MetricCard label="Invito → Click" value={g.inviteToClicked} icon={<MousePointer size={16} />} />
        <MetricCard label="Invito → Registrazione" value={g.inviteToRegistered} icon={<UserCheck size={16} />} />
        <MetricCard label="Registrazione → Check-in" value={g.registeredToCheckedIn} icon={<QrCode size={16} />} />
        <MetricCard label="Invito → Check-in" value={g.inviteToCheckedIn} icon={<BarChart3 size={16} />} />
      </div>

      {/* ═══ Timeline ═══ */}
      {timelineTotal > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <h2 className="text-sm font-bold text-warm-600 uppercase tracking-wider mb-4">Tempo tra invito e registrazione</h2>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {[
              { label: "< 1h", count: tl!.within1h, color: "bg-teal-500" },
              { label: "1-24h", count: tl!.within24h, color: "bg-teal-400" },
              { label: "1-3gg", count: tl!.within3d, color: "bg-amber-400" },
              { label: "3-7gg", count: tl!.within7d, color: "bg-amber-500" },
              { label: "> 7gg", count: tl!.after7d, color: "bg-warm-400" },
            ].filter((s) => s.count > 0).map((s) => (
              <div key={s.label} className={`${s.color} flex items-center justify-center text-white text-[10px] font-bold transition-all`}
                style={{ width: `${(s.count / timelineTotal) * 100}%`, minWidth: s.count > 0 ? "40px" : "0" }}
                title={`${s.label}: ${s.count}`}>
                {s.count}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-warm-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-500" /> &lt; 1h: {tl!.within1h}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal-400" /> 1-24h: {tl!.within24h}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> 1-3gg: {tl!.within3d}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> 3-7gg: {tl!.within7d}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warm-400" /> &gt; 7gg: {tl!.after7d}</span>
          </div>
        </div>
      )}

      {/* ═══ Event comparison ═══ */}
      {data.byEvent.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-x-auto">
          <div className="p-4 border-b border-warm-100">
            <h2 className="text-sm font-bold text-warm-600 uppercase tracking-wider">Confronto eventi</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-warm-50 border-b border-warm-200">
              <Th>Evento</Th><Th className="text-center">Invitati</Th><Th className="text-center">Aperti</Th><Th className="text-center">Click</Th><Th className="text-center">Registrati</Th><Th className="text-center">Check-in</Th><Th className="text-center">Inv→Reg %</Th><Th className="text-center">Reg→Check %</Th>
            </tr></thead>
            <tbody className="divide-y divide-warm-100">
              {data.byEvent.map((e) => (
                <tr key={e.landingPageId} className="hover:bg-warm-50/50">
                  <td className="px-4 py-3 font-medium text-warm-800">{e.name}</td>
                  <td className="px-4 py-3 text-center text-warm-600">{e.invited}</td>
                  <td className="px-4 py-3 text-center text-warm-600">{e.opened}</td>
                  <td className="px-4 py-3 text-center text-warm-600">{e.clicked}</td>
                  <td className="px-4 py-3 text-center text-warm-600">{e.registered}</td>
                  <td className="px-4 py-3 text-center text-warm-600">{e.checkedIn}</td>
                  <td className="px-4 py-3 text-center font-medium text-warm-700">{pct(e.inviteToRegistered)}</td>
                  <td className="px-4 py-3 text-center font-medium text-warm-700">{pct(e.registeredToCheckedIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Status tabs ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
        <div className="flex border-b border-warm-200 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button key={tab.key} onClick={() => { setActiveStatusTab(tab.key); setStatusSearch(""); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${activeStatusTab === tab.key ? "border-warm-800 text-warm-800" : "border-transparent text-warm-400 hover:text-warm-600"}`}>
              {tab.label}
              <span className="text-[10px] font-bold bg-warm-100 text-warm-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="p-4 flex items-center gap-3 border-b border-warm-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input type="text" value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)}
              placeholder="Cerca email o nome..." className="w-full pl-9 pr-4 py-2 border border-warm-300 rounded-lg text-sm focus:border-warm-800 focus:outline-none" />
          </div>
          <a href={exportUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-warm-100 text-warm-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors">
            <Download size={14} /> CSV
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-warm-50 border-b border-warm-200">
              <Th>Email</Th>
              {activeStatusTab !== "invitedNotRegistered" && <Th>Nome</Th>}
              {activeStatusTab === "invitedNotRegistered" && <><Th>Inviato</Th><Th>Aperto</Th><Th>Cliccato</Th><Th>Evento</Th></>}
              {activeStatusTab === "registeredNotCheckedIn" && <><Th>Sorgente</Th><Th>Registrato</Th></>}
              {activeStatusTab === "checkedIn" && <><Th>Sorgente</Th><Th>Check-in</Th></>}
              {activeStatusTab === "registeredWithoutInvite" && <Th>Registrato</Th>}
            </tr></thead>
            <tbody className="divide-y divide-warm-100">
              {currentStatusList.slice(0, 100).map((item, idx) => (
                <tr key={idx} className="hover:bg-warm-50/50">
                  <td className="px-4 py-3 text-warm-700">{item.email}</td>
                  {activeStatusTab !== "invitedNotRegistered" && <td className="px-4 py-3 text-warm-600">{item.name || "—"}</td>}
                  {activeStatusTab === "invitedNotRegistered" && (
                    <>
                      <td className="px-4 py-3 text-warm-500 text-xs">{fmtDate(item.sentAt)}</td>
                      <td className="px-4 py-3">{item.openedAt ? <span className="text-green-600 text-xs font-medium">Sì</span> : <span className="text-warm-300 text-xs">No</span>}</td>
                      <td className="px-4 py-3">{item.clickedAt ? <span className="text-green-600 text-xs font-medium">Sì</span> : <span className="text-warm-300 text-xs">No</span>}</td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{item.landingPageName}</td>
                    </>
                  )}
                  {activeStatusTab === "registeredNotCheckedIn" && (
                    <>
                      <td className="px-4 py-3"><SourceBadge source={item.source} /></td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{fmtDate(item.registeredAt)}</td>
                    </>
                  )}
                  {activeStatusTab === "checkedIn" && (
                    <>
                      <td className="px-4 py-3"><SourceBadge source={item.source} /></td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{fmtDate(item.checkedInAt)}</td>
                    </>
                  )}
                  {activeStatusTab === "registeredWithoutInvite" && (
                    <td className="px-4 py-3 text-warm-500 text-xs">{fmtDate(item.registeredAt)}</td>
                  )}
                </tr>
              ))}
              {currentStatusList.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-warm-400">Nessun risultato</td></tr>
              )}
            </tbody>
          </table>
          {currentStatusList.length > 100 && (
            <div className="px-4 py-3 text-xs text-warm-400 border-t border-warm-100">
              Mostrati 100 di {currentStatusList.length} — esporta il CSV per la lista completa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function FunnelBar({ label, count, max, color, icon }: { label: string; count: number; max: number; color: string; icon: React.ReactNode }) {
  const pctVal = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0 flex items-center gap-2 text-sm text-warm-600">
        <span className="text-warm-400">{icon}</span> {label}
      </div>
      <div className="flex-1 bg-warm-100 rounded-full h-7 overflow-hidden relative">
        <div className={`${color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3`}
          style={{ width: `${Math.max(pctVal, count > 0 ? 8 : 0)}%` }}>
          {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
        </div>
      </div>
      <div className="w-14 text-right text-xs font-medium text-warm-500">{max > 0 ? `${pctVal.toFixed(1)}%` : "—"}</div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-4 text-center">
      <div className="text-warm-400 mb-2 flex justify-center">{icon}</div>
      <div className="text-2xl font-bold text-warm-800">{pct(value)}</div>
      <div className="text-[10px] text-warm-500 mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (source === "invite") return <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-600">Invito</span>;
  if (source === "direct") return <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-600">Diretto</span>;
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-warm-100 text-warm-500">—</span>;
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 font-semibold text-warm-600 text-xs uppercase tracking-wider ${className}`}>{children}</th>;
}

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function fmtDate(d?: string | null) { return d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }
