"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Eye, Users, Globe, Smartphone, RefreshCw, CalendarDays, Layers } from "lucide-react";

interface NC { name: string; count: number }
interface Kpi {
  views: number; unique: number; avg: number; avgUnit: string;
  periodDays: number; minDate: string | null; maxDate: string | null;
  pagesPerUser: number; sito: number; store: number;
}
interface Data {
  filterHost: string;
  range: string;
  isHourly: boolean;
  kpi: Kpi;
  series: { date: string; views: number }[];
  topPages: { path: string; count: number }[];
  geo: { countries: NC[]; regions: NC[]; cities: NC[] };
  sources: NC[];
  devices: NC[];
  recent: { path: string; host: string; city: string | null; country: string | null; referrer: string | null; createdAt: string; hits: number }[];
  recentHasMore?: boolean;
}

const PIE = ["#8a6d3b", "#b08968", "#cdb38b", "#7d8c7a", "#9c6644", "#6b705c", "#a5a58d", "#c9ada7"];
const fmtD = (s: string) => { try { return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }); } catch { return s; } };
const fmtBucket = (s: string, hourly: boolean) => {
  if (hourly) { const m = s.match(/(\d{2}):00$/); return m ? m[1] + "h" : s; }
  return fmtD(s);
};
const fmtDT = (s: string) => { try { return new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return s; } };

function Bars({ items, color = "#8a6d3b" }: { items: NC[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="text-xs text-warm-400">Nessun dato.</p>;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.name}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-warm-700 truncate pr-2">{it.name}</span>
            <span className="text-warm-500 shrink-0">{it.count.toLocaleString("it-IT")}</span>
          </div>
          <div className="h-2.5 bg-warm-100 rounded"><div className="h-2.5 rounded" style={{ width: `${(it.count / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

function Pie({ items }: { items: NC[] }) {
  const tot = items.reduce((s, i) => s + i.count, 0) || 1;
  let acc = 0;
  const stops = items.slice(0, 8).map((it, i) => {
    const a = (acc / tot) * 360; acc += it.count; const b = (acc / tot) * 360;
    return { ...it, color: PIE[i % PIE.length], css: `${PIE[i % PIE.length]} ${a}deg ${b}deg` };
  });
  if (!stops.length) return <p className="text-xs text-warm-400">Nessun dato.</p>;
  return (
    <div className="flex items-center gap-5">
      <div className="w-28 h-28 rounded-full shrink-0" style={{ background: `conic-gradient(${stops.map((s) => s.css).join(",")})` }} />
      <div className="space-y-1 text-xs">
        {stops.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: s.color }} />
            <span className="text-warm-700">{s.name}</span>
            <span className="text-warm-400">{Math.round((s.count / tot) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-warm-200 rounded-lg p-4">{children}</div>;
}

const RANGES: [string, string][] = [
  ["1d", "Ultimo giorno"], ["7d", "7 giorni"], ["30d", "30 giorni"], ["1y", "1 anno"], ["all", "Totale"],
];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState<"" | "SITO" | "STORE">("");
  const [range, setRange] = useState<string>("all");
  const [recent, setRecent] = useState<Data["recent"]>([]);
  const [recMore, setRecMore] = useState(false);
  const [recLoading, setRecLoading] = useState(false);

  const qs = useCallback((extra = "") => {
    const p = new URLSearchParams();
    if (host) p.set("host", host);
    if (range) p.set("range", range);
    const s = p.toString();
    return `${s ? `?${s}` : ""}${extra ? (s ? "&" : "?") + extra : ""}`;
  }, [host, range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/analytics${qs()}`, { cache: "no-store" });
      const j = await r.json();
      setData(j.data || null);
      setRecent(j.data?.recent || []);
      setRecMore(!!j.data?.recentHasMore);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [qs]);

  const loadMore = useCallback(async () => {
    setRecLoading(true);
    try {
      const r = await fetch(`/api/analytics${qs(`recentPage=1&offset=${recent.length}`)}`, { cache: "no-store" });
      const j = await r.json();
      setRecent((prev) => [...prev, ...(j.data?.recent || [])]);
      setRecMore(!!j.data?.hasMore);
    } catch { /* ignore */ } finally { setRecLoading(false); }
  }, [qs, recent.length]);

  useEffect(() => { load(); }, [load]);

  const k = data?.kpi;
  const maxSeries = Math.max(1, ...(data?.series.map((s) => s.views) || [1]));
  const periodLabel = k && k.minDate
    ? `${k.periodDays} ${k.periodDays === 1 ? "giorno" : "giorni"} · ${fmtD(String(k.minDate))}–${fmtD(String(k.maxDate))}`
    : "—";

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-warm-800 flex items-center gap-2"><BarChart3 size={22} /> Analisi Traffico</h1>
        <button onClick={load} className="flex items-center gap-1.5 text-sm border border-warm-300 px-3 py-2 rounded-lg hover:bg-warm-50"><RefreshCw size={14} /> Aggiorna</button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-warm-300 text-sm">
          {([["", "Tutto"], ["SITO", "Sito"], ["STORE", "Store"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setHost(v as "" | "SITO" | "STORE")}
              className={`px-4 py-2 ${host === v ? "bg-warm-800 text-white" : "bg-white text-warm-600 hover:bg-warm-50"}`}>{l}</button>
          ))}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-warm-300 text-sm">
          {RANGES.map(([v, l]) => (
            <button key={v} onClick={() => setRange(v)}
              className={`px-4 py-2 ${range === v ? "bg-warm-800 text-white" : "bg-white text-warm-600 hover:bg-warm-50"}`}>{l}</button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center text-warm-400">Caricamento…</div>
      ) : (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { i: <Eye size={16} />, l: "Pagine viste", v: k!.views.toLocaleString("it-IT"), s: "" },
              { i: <Users size={16} />, l: "Visitatori unici", v: k!.unique.toLocaleString("it-IT"), s: "" },
              { i: <BarChart3 size={16} />, l: `Media / ${k!.avgUnit}`, v: k!.avg.toLocaleString("it-IT"), s: "visitatori unici" },
              { i: <Layers size={16} />, l: "Pagine per utente", v: String(k!.pagesPerUser), s: "media nel periodo" },
              { i: <CalendarDays size={16} />, l: "Periodo", v: String(k!.periodDays), s: periodLabel },
            ].map((c) => (
              <Card key={c.l}>
                <div className="text-warm-400 mb-1">{c.i}</div>
                <div className="text-2xl font-bold text-warm-900">{c.v}</div>
                <div className="text-[11px] text-warm-500 uppercase tracking-wide">{c.l}</div>
                {c.s && <div className="text-[10px] text-warm-400 mt-0.5">{c.s}</div>}
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card><div className="text-xs text-warm-500 uppercase">Sito principale</div><div className="text-xl font-bold text-warm-900">{k!.sito.toLocaleString("it-IT")}</div><div className="text-[10px] text-warm-400">visitatori unici nel periodo</div></Card>
            <Card><div className="text-xs text-warm-500 uppercase">Store</div><div className="text-xl font-bold text-warm-900">{k!.store.toLocaleString("it-IT")}</div><div className="text-[10px] text-warm-400">visitatori unici nel periodo</div></Card>
          </div>

          {/* Andamento */}
          <Card>
            <h3 className="text-sm font-semibold text-warm-800 mb-4">Andamento {data.isHourly ? "orario" : "giornaliero"} (visitatori unici)</h3>
            {data.series.length === 0 ? <p className="text-xs text-warm-400">Nessun dato nel periodo.</p> : (
              <div className="flex items-end gap-1.5 h-44">
                {data.series.map((s) => (
                  <div key={s.date} className="flex-1 flex flex-col items-center gap-1 group min-w-[8px]">
                    <div className="text-[10px] text-warm-500 opacity-0 group-hover:opacity-100">{s.views.toLocaleString("it-IT")}</div>
                    <div className="w-full bg-warm-700 rounded-t" style={{ height: `${(s.views / maxSeries) * 150}px` }} />
                    <div className="text-[9px] text-warm-400 -rotate-45 origin-top-left whitespace-nowrap mt-1">{fmtBucket(s.date, data.isHourly)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Geo */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-2"><Globe size={15} /> Nazioni</h3><Pie items={data.geo.countries} /></Card>
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3">Sorgenti traffico</h3><Pie items={data.sources} /></Card>
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3">Top città</h3><Bars items={data.geo.cities} color="#9c6644" /></Card>
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3">Top regioni</h3><Bars items={data.geo.regions} color="#7d8c7a" /></Card>
          </div>

          {/* Pagine + dispositivi */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3">Pagine più viste</h3><Bars items={data.topPages.map((p) => ({ name: p.path, count: p.count }))} /></Card>
            <Card><h3 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-2"><Smartphone size={15} /> Dispositivi</h3><Pie items={data.devices} /></Card>
          </div>

          {/* Recenti */}
          <Card>
            <h3 className="text-sm font-semibold text-warm-800 mb-1">Visite recenti</h3>
            <p className="text-[11px] text-warm-400 mb-3">Raggruppate per visitatore, pagina e minuto. ×N = richieste nella stessa visita.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-warm-500 uppercase tracking-wide text-left bg-white">
                  <tr><th className="py-1 pr-3">Quando</th><th className="py-1 pr-3">Dove</th><th className="py-1 pr-3">Pagina</th><th className="py-1 pr-3">Città</th><th className="py-1 pr-3">Paese</th><th className="py-1">Hit</th></tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={i} className="border-t border-warm-100">
                      <td className="py-1 pr-3 whitespace-nowrap text-warm-500">{fmtDT(r.createdAt)}</td>
                      <td className="py-1 pr-3"><span className={`px-1.5 py-0.5 rounded text-[10px] ${r.host === "STORE" ? "bg-amber-100 text-amber-800" : "bg-warm-100 text-warm-700"}`}>{r.host || "?"}</span></td>
                      <td className="py-1 pr-3 max-w-[260px] truncate">{r.path}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{r.city || "—"}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{r.country || "—"}</td>
                      <td className="py-1 whitespace-nowrap text-warm-500">{r.hits > 1 ? `×${r.hits}` : "1"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              {recMore ? (
                <button onClick={loadMore} disabled={recLoading}
                  className="text-sm border border-warm-300 px-5 py-2 rounded-lg hover:bg-warm-50 disabled:opacity-50">
                  {recLoading ? "Carico…" : "Prosegui ↓"}
                </button>
              ) : (
                <span className="text-xs text-warm-400">Fine elenco ({recent.length} visite)</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
