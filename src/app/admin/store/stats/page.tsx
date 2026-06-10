"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Euro, ShoppingCart, TrendingUp, Target, ShoppingBag, Award,
  UserPlus, Users, Globe, RefreshCw, CalendarDays, ArrowUp, ArrowDown, Minus, Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/format";

interface ProductRow { name: string; slug: string | null; quantity: number; revenueCents: number }
interface ChannelRow { name: string; count: number }
interface PeriodStats {
  from: string;
  to: string;
  periodDays: number;
  revenueCents: number;
  orderCount: number;
  aovCents: number;
  uniqueVisitors: number;
  conversionRate: number;
  abandonedCount: number;
  newCustomers: number;
  recurringCustomers: number;
  topProducts: ProductRow[];
  bottomProducts: ProductRow[];
  channels: ChannelRow[];
}
interface ApiData {
  current: PeriodStats;
  compare: PeriodStats | null;
  totals: { revenueCents: number; orderCount: number };
}

type PeriodKey = "today" | "7d" | "30d" | "12m" | "year" | "all" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Oggi",
  "7d": "Ultimi 7 giorni",
  "30d": "Ultimi 30 giorni",
  "12m": "Ultimi 12 mesi",
  year: "Anno in corso",
  all: "Tutto",
  custom: "Personalizzato",
};

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { useGrouping: "always", style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format((cents || 0) / 100);
const pct = (n: number) =>
  new Intl.NumberFormat("it-IT", { useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + "%";

// Calcola from/to da PeriodKey (date in UTC, inizio giornata / fine giornata).
function rangeForPeriod(p: PeriodKey, customFrom?: string, customTo?: string): { from: Date; to: Date } | null {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (p === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  }
  if (p === "7d") {
    const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  }
  if (p === "30d") {
    const start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  }
  if (p === "12m") {
    const start = new Date(now); start.setMonth(start.getMonth() - 12); start.setHours(0, 0, 0, 0);
    return { from: start, to: end };
  }
  if (p === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { from: start, to: end };
  }
  if (p === "all") {
    return { from: new Date("2000-01-01"), to: end };
  }
  if (p === "custom") {
    if (!customFrom || !customTo) return null;
    const f = new Date(customFrom + "T00:00:00");
    const t = new Date(customTo + "T23:59:59");
    return { from: f, to: t };
  }
  return null;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null; // infinite — meglio non mostrare un %
  }
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-[10px] text-warm-400">— nuovo</span>;
  const isUp = value > 0;
  const isDown = value < 0;
  // invert=true: per metriche dove "in calo" è positivo (es. carrelli abbandonati)
  const good = invert ? isDown : isUp;
  const bad = invert ? isUp : isDown;
  const cls = good ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : bad ? "text-red-700 bg-red-50 border-red-200"
            : "text-warm-500 bg-warm-50 border-warm-200";
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
      <Icon size={10} />
      {sign}{value.toFixed(1)}%
    </span>
  );
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return s; }
}

function Bars({ items, max, valueFmt }: { items: { name: string; value: number; sub?: string }[]; max: number; valueFmt: (n: number) => string }) {
  if (!items.length) return <p className="text-xs text-warm-400">Nessun dato nel periodo.</p>;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.name}>
          <div className="flex justify-between items-baseline text-xs mb-0.5 gap-3">
            <span className="text-warm-800 truncate min-w-0">{it.name}</span>
            <span className="text-warm-500 shrink-0 tabular-nums">{valueFmt(it.value)}{it.sub ? ` · ${it.sub}` : ""}</span>
          </div>
          <div className="h-2 bg-warm-100 rounded">
            <div className="h-2 rounded bg-warm-800" style={{ width: `${Math.min(100, (it.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StoreStatsPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [compareEnabled, setCompareEnabled] = useState<boolean>(true);
  const [customCompare, setCustomCompare] = useState<boolean>(false);
  const [compareFrom, setCompareFrom] = useState<string>("");
  const [compareTo, setCompareTo] = useState<string>("");
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => rangeForPeriod(period, customFrom, customTo), [period, customFrom, customTo]);

  // Riferimento alla AbortController della richiesta corrente, così cambiando
  // periodo annulliamo la fetch precedente: se l'utente clicca rapidamente su
  // più periodi, l'UI mostra SEMPRE i dati dell'ultimo selezionato, mai una
  // risposta lenta arrivata dopo un click successivo.
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!range) return;
    // Annulla la richiesta precedente se ancora in volo.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const p = new URLSearchParams();
    p.set("from", range.from.toISOString());
    p.set("to", range.to.toISOString());
    if (!compareEnabled) {
      p.set("compare", "0");
    } else if (customCompare && compareFrom && compareTo) {
      p.set("compareFrom", new Date(compareFrom + "T00:00:00").toISOString());
      p.set("compareTo", new Date(compareTo + "T23:59:59").toISOString());
    }
    try {
      const r = await fetch(`/api/admin/store/stats?${p.toString()}`, { cache: "no-store", signal: ctrl.signal });
      const j = await r.json();
      if (!ctrl.signal.aborted && j.success) setData(j.data);
    } catch (e) {
      // Abortita: non sovrascrivere lo stato. Per qualsiasi altro errore,
      // resta il dato precedente (l'utente vede "Errore di caricamento" non
      // necessario qui).
      if ((e as { name?: string })?.name !== "AbortError") {
        // Non rilancio: l'UI rimane sul dato precedente.
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [range, compareEnabled, customCompare, compareFrom, compareTo]);

  // Debounce di 250ms: evita chiamate a raffica quando l'utente digita date
  // custom o switcha rapidamente tra periodi.
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const cur = data?.current;
  const cmp = data?.compare ?? null;

  const dRevenue = cur && cmp ? deltaPct(cur.revenueCents, cmp.revenueCents) : null;
  const dOrders = cur && cmp ? deltaPct(cur.orderCount, cmp.orderCount) : null;
  const dAov = cur && cmp ? deltaPct(cur.aovCents, cmp.aovCents) : null;
  const dConv = cur && cmp ? deltaPct(cur.conversionRate, cmp.conversionRate) : null;
  const dAbandoned = cur && cmp ? deltaPct(cur.abandonedCount, cmp.abandonedCount) : null;
  const dNew = cur && cmp ? deltaPct(cur.newCustomers, cmp.newCustomers) : null;
  const dRecurring = cur && cmp ? deltaPct(cur.recurringCustomers, cmp.recurringCustomers) : null;

  const periodLabel = cur ? `${cur.periodDays} ${cur.periodDays === 1 ? "giorno" : "giorni"} · ${fmtDate(cur.from)} → ${fmtDate(cur.to)}` : "—";
  const cmpLabel = cmp ? `${cmp.periodDays} ${cmp.periodDays === 1 ? "giorno" : "giorni"} · ${fmtDate(cmp.from)} → ${fmtDate(cmp.to)}` : null;

  const customersTotalCur = (cur?.newCustomers ?? 0) + (cur?.recurringCustomers ?? 0);

  return (
    <div className="p-6 md:p-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl font-semibold text-warm-800 flex items-center gap-2">
          <BarChart3 size={22} /> Statistiche Store
        </h1>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm border border-warm-300 px-3 py-2 rounded-lg hover:bg-warm-50 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Aggiorna
        </button>
      </div>
      <p className="text-sm text-warm-500 mb-5">
        Vendite, conversione, prodotti e clienti per periodo · confronto col periodo precedente.
      </p>

      {/* Selettore periodo */}
      <div className="bg-white border border-warm-200 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays size={14} className="text-warm-500" />
          <span className="text-xs font-medium text-warm-600 uppercase tracking-wider mr-2">Periodo</span>
          <div className="flex rounded-lg overflow-hidden border border-warm-300 text-sm">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`px-3 py-1.5 ${period === k ? "bg-warm-800 text-white" : "bg-white text-warm-600 hover:bg-warm-50"}`}>
                {PERIOD_LABELS[k]}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 border border-warm-300 rounded text-sm" />
              <span className="text-warm-500 text-xs">→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 border border-warm-300 rounded text-sm" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-warm-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
              className="w-4 h-4 accent-warm-800" />
            <span className="text-xs text-warm-700">Confronta con periodo precedente</span>
          </label>
          {compareEnabled && (
            <>
              <label className="flex items-center gap-2 cursor-pointer ml-3">
                <input type="checkbox" checked={customCompare}
                  onChange={(e) => setCustomCompare(e.target.checked)}
                  className="w-4 h-4 accent-warm-800" />
                <span className="text-xs text-warm-700">Periodo di confronto personalizzato</span>
              </label>
              {customCompare && (
                <div className="flex items-center gap-2 ml-2">
                  <input type="date" value={compareFrom} onChange={(e) => setCompareFrom(e.target.value)}
                    className="px-2 py-1.5 border border-warm-300 rounded text-sm" />
                  <span className="text-warm-500 text-xs">→</span>
                  <input type="date" value={compareTo} onChange={(e) => setCompareTo(e.target.value)}
                    className="px-2 py-1.5 border border-warm-300 rounded text-sm" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-[11px] text-warm-500 pt-1">
          <strong>Periodo attuale:</strong> {periodLabel}
          {cmpLabel && <span className="ml-3"><strong>Confronto:</strong> {cmpLabel}</span>}
          {data && <span className="ml-3 text-warm-400">· Totale storico: {eur(data.totals.revenueCents)} su {formatNumber(data.totals.orderCount)} ordini</span>}
        </div>
      </div>

      {/* KPI principali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<Euro size={16} />} label="Fatturato" loading={loading && !cur} value={cur ? eur(cur.revenueCents) : null}
          sub={cmp ? `vs ${eur(cmp.revenueCents)} prec.` : undefined}
          delta={<DeltaBadge value={dRevenue} />} />
        <KpiCard icon={<ShoppingCart size={16} />} label="Ordini" loading={loading && !cur} value={cur ? formatNumber(cur.orderCount) : null}
          sub={cmp ? `vs ${formatNumber(cmp.orderCount)} prec.` : undefined}
          delta={<DeltaBadge value={dOrders} />} />
        <KpiCard icon={<TrendingUp size={16} />} label="Valore medio ordine" loading={loading && !cur} value={cur ? eur(cur.aovCents) : null}
          sub={cmp ? `vs ${eur(cmp.aovCents)} prec.` : undefined}
          delta={<DeltaBadge value={dAov} />} />
        <KpiCard icon={<Target size={16} />} label="Tasso conversione" loading={loading && !cur} value={cur ? pct(cur.conversionRate) : null}
          sub={cur ? `${formatNumber(cur.uniqueVisitors)} visitatori unici store` : undefined}
          delta={<DeltaBadge value={dConv} />} />
      </div>

      {/* Secondari */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={<ShoppingBag size={16} />} label="Carrelli abbandonati" loading={loading && !cur} value={cur ? formatNumber(cur.abandonedCount) : null}
          sub={cmp ? `vs ${formatNumber(cmp.abandonedCount)} prec.` : undefined}
          delta={<DeltaBadge value={dAbandoned} invert />}
          link="/admin/store/abandoned-carts" />
        <KpiCard icon={<UserPlus size={16} />} label="Clienti nuovi" loading={loading && !cur} value={cur ? formatNumber(cur.newCustomers) : null}
          sub={cur && customersTotalCur > 0 ? `${Math.round((cur.newCustomers / customersTotalCur) * 100)}% del totale` : undefined}
          delta={<DeltaBadge value={dNew} />} />
        <KpiCard icon={<Users size={16} />} label="Clienti ricorrenti" loading={loading && !cur} value={cur ? formatNumber(cur.recurringCustomers) : null}
          sub={cur && customersTotalCur > 0 ? `${Math.round((cur.recurringCustomers / customersTotalCur) * 100)}% del totale` : undefined}
          delta={<DeltaBadge value={dRecurring} />} />
        <KpiCard icon={<Globe size={16} />} label="Visitatori unici store" loading={loading && !cur} value={cur ? formatNumber(cur.uniqueVisitors) : null}
          sub={cur ? `${formatNumber(Math.round(cur.uniqueVisitors / (cur.periodDays || 1)))}/giorno` : undefined} />
      </div>

      {/* Prodotti + Canali */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-warm-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-1.5">
            <Award size={14} /> Prodotti più venduti
          </h2>
          <Bars
            items={(cur?.topProducts || []).map((p) => ({ name: p.name, value: p.revenueCents, sub: `${formatNumber(p.quantity)} pz` }))}
            max={Math.max(1, ...(cur?.topProducts || []).map((p) => p.revenueCents))}
            valueFmt={eur}
          />
        </div>
        <div className="bg-white border border-warm-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-1.5">
            <ShoppingBag size={14} /> Prodotti meno venduti
          </h2>
          {cur && cur.bottomProducts.length > 0 ? (
            <div className="space-y-1.5 text-xs">
              {cur.bottomProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-3 py-1 border-b border-warm-100 last:border-b-0">
                  <span className="text-warm-800 truncate min-w-0">
                    {p.slug ? (
                      <Link href={`/admin/store/products/${p.slug}`} className="hover:underline">{p.name}</Link>
                    ) : p.name}
                  </span>
                  <span className="text-warm-500 shrink-0 tabular-nums">
                    {formatNumber(p.quantity)} pz · {eur(p.revenueCents)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-warm-400">Nessun dato.</p>
          )}
          <p className="text-[11px] text-warm-400 mt-3">
            Calcolato sui prodotti store attivi: priorità a quelli con meno pezzi venduti nel periodo.
          </p>
        </div>
      </div>

      <div className="bg-white border border-warm-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-1.5">
          <Globe size={14} /> Canali di acquisizione (traffico store)
        </h2>
        <Bars
          items={(cur?.channels || []).map((c) => ({ name: c.name, value: c.count }))}
          max={Math.max(1, ...(cur?.channels || []).map((c) => c.count))}
          valueFmt={(n) => formatNumber(n)}
        />
        <p className="text-[11px] text-warm-400 mt-3">
          Sorgenti dei visitatori store nel periodo (basato sul referrer). Proxy per i canali che generano vendite — la conversione vera richiede attribution UTM non ancora tracciato.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-warm-500">
        <div className="bg-warm-50 border border-warm-200 rounded p-3">
          <strong className="text-warm-700">Come leggere il confronto:</strong> il badge accanto a ogni KPI mostra la variazione % rispetto al periodo precedente. Verde = in crescita, rosso = in calo. Per i <em>carrelli abbandonati</em> i colori sono invertiti (in calo = buona notizia).
        </div>
        <div className="bg-warm-50 border border-warm-200 rounded p-3">
          <strong className="text-warm-700">Tasso di conversione:</strong> ordini del periodo ÷ visitatori unici store del periodo. Visitatori unici = device distinti (per IP hash) sulle pagine store.
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, delta, link, loading }: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sub?: string;
  delta?: React.ReactNode;
  link?: string;
  loading?: boolean;
}) {
  const showSkeleton = loading || value === null || value === "";
  const inner = (
    <div className="bg-white border border-warm-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-warm-500">{icon}<span className="text-[11px] uppercase tracking-wider font-medium">{label}</span></div>
        {showSkeleton ? null : delta}
      </div>
      {showSkeleton ? (
        <div className="h-8 w-2/3 bg-warm-100 rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-semibold text-warm-900 tabular-nums">{value}</div>
      )}
      {sub && !showSkeleton && <div className="text-[11px] text-warm-500 mt-1">{sub}</div>}
      {showSkeleton && <div className="h-3 w-1/2 bg-warm-50 rounded animate-pulse mt-2" />}
    </div>
  );
  if (link) return <Link href={link} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}
