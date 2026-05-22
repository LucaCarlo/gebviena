"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { RefreshCw, Download, Eye } from "lucide-react";

interface Row {
  email: string;
  firstName: string | null;
  lastName: string | null;
  ipAddress?: string | null;
  geoCity?: string | null;
  geoRegion?: string | null;
  geoCountry?: string | null;
  emailStatus?: string | null;
  emailError?: string | null;
  emailSentAt?: string | null;
  createdAt: string;
}

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
};

const PIE_COLORS = ["#8a6d3b", "#b08968", "#cdb38b", "#7d8c7a", "#9c6644", "#6b705c", "#a5a58d", "#b7b7a4"];

function tally(rows: Row[], key: (r: Row) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (key(r) || "").trim();
    if (!v) continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

export default function RegistrantsData() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [onlyGeo, setOnlyGeo] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter/subscribers", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRows(data.data as Row[]);
        setUpdatedAt(new Date());
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const countries = useMemo(
    () => tally(rows, (r) => r.geoCountry).map(([c]) => c),
    [rows],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyGeo && !(r.geoCity || r.geoCountry)) return false;
      if (countryFilter && (r.geoCountry || "") !== countryFilter) return false;
      if (qq) {
        const hay = `${r.firstName || ""} ${r.lastName || ""} ${r.email} ${r.geoCity || ""} ${r.geoRegion || ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [rows, q, countryFilter, onlyGeo]);

  const topCities = useMemo(() => tally(filtered, (r) => r.geoCity).slice(0, 10), [filtered]);
  const byCountry = useMemo(() => tally(filtered, (r) => r.geoCountry), [filtered]);
  const withGeo = filtered.filter((r) => r.geoCity || r.geoCountry).length;
  const maxCity = topCities[0]?.[1] || 1;
  const geoTotal = byCountry.reduce((s, [, n]) => s + n, 0) || 1;

  // conic-gradient per la torta paesi
  let acc = 0;
  const pieStops = byCountry.map(([c, n], i) => {
    const start = (acc / geoTotal) * 360;
    acc += n;
    const end = (acc / geoTotal) * 360;
    return { c, n, color: PIE_COLORS[i % PIE_COLORS.length], css: `${PIE_COLORS[i % PIE_COLORS.length]} ${start}deg ${end}deg` };
  });
  const pieCss = pieStops.length ? `conic-gradient(${pieStops.map((s) => s.css).join(",")})` : "#eee";

  const exportCsv = () => {
    const e = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["Nome", "Cognome", "Email", "Stato email", "Errore email", "Email inviata", "IP", "Città", "Regione", "Paese", "Data e ora"].map(e).join(";");
    const st = (s?: string | null) => s === "sent" ? "Inviata" : s === "error" ? "Errore" : "In attesa";
    const lines = filtered.map((r) =>
      [r.firstName, r.lastName, r.email, st(r.emailStatus), r.emailError || "", r.emailSentAt ? fmt(r.emailSentAt) : "",
       r.ipAddress, r.geoCity, r.geoRegion, r.geoCountry, fmt(r.createdAt)].map(e).join(";"));
    const csv = "﻿" + [head, ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `iscritti-dati_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-warm-900">Dati iscritti</h2>
          <p className="text-xs text-warm-500">
            {filtered.length} mostrati / {rows.length} totali · {withGeo} con geolocalizzazione
            {updatedAt && <> · aggiornato {updatedAt.toLocaleTimeString("it-IT")}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm border border-warm-300 px-3 py-2 rounded-lg hover:bg-warm-50">
            <RefreshCw size={14} /> Aggiorna
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-sm bg-warm-800 text-white px-3 py-2 rounded-lg hover:bg-warm-900">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca nome, email, città…"
          className="flex-1 min-w-[200px] border border-warm-300 rounded-lg px-3 py-2 text-sm focus:border-warm-700 outline-none"
        />
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
          className="border border-warm-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tutti i paesi</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-warm-600 px-2">
          <input type="checkbox" checked={onlyGeo} onChange={(e) => setOnlyGeo(e.target.checked)} />
          Solo con geolocalizzazione
        </label>
      </div>

      {loading ? (
        <div className="py-16 text-center text-warm-400 text-sm">Caricamento…</div>
      ) : (
        <>
          {/* Card riepilogo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              ["Iscritti", filtered.length],
              ["Email inviate", filtered.filter((r) => r.emailStatus === "sent").length],
              ["Email errore", filtered.filter((r) => r.emailStatus === "error").length],
              ["In attesa", filtered.filter((r) => !r.emailStatus).length],
            ].map(([label, val]) => (
              <div key={label} className="bg-white border border-warm-200 rounded-lg p-3">
                <div className="text-2xl font-bold text-warm-900">{val as number}</div>
                <div className="text-xs text-warm-500 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>

          {/* Grafici */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white border border-warm-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-warm-800 mb-3">Top 10 città</h3>
              {topCities.length === 0 ? <p className="text-xs text-warm-400">Nessun dato geo ancora.</p> : (
                <div className="space-y-2">
                  {topCities.map(([city, n]) => (
                    <div key={city}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-warm-700">{city}</span>
                        <span className="text-warm-500">{n}</span>
                      </div>
                      <div className="h-2.5 bg-warm-100 rounded">
                        <div className="h-2.5 rounded bg-warm-700" style={{ width: `${(n / maxCity) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white border border-warm-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-warm-800 mb-3">Distribuzione per paese</h3>
              {pieStops.length === 0 ? <p className="text-xs text-warm-400">Nessun dato geo ancora.</p> : (
                <div className="flex items-center gap-5">
                  <div className="w-28 h-28 rounded-full shrink-0" style={{ background: pieCss }} />
                  <div className="space-y-1 text-xs">
                    {pieStops.slice(0, 8).map((s) => (
                      <div key={s.c} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: s.color }} />
                        <span className="text-warm-700">{s.c}</span>
                        <span className="text-warm-400">{s.n} ({Math.round((s.n / geoTotal) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Elenco */}
          <div className="overflow-x-auto border border-warm-200 rounded-lg max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-50 sticky top-0">
                <tr className="text-left text-warm-500 text-xs uppercase tracking-wide">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Stato email</th>
                  <th className="px-3 py-2">Paese</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = r.emailStatus;
                  const badge = st === "sent"
                    ? <span className="px-2 py-0.5 rounded text-[11px] bg-green-100 text-green-800">Inviata</span>
                    : st === "error"
                      ? <span className="px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-800">Errore</span>
                      : <span className="text-warm-400">—</span>;
                  const open = openRow === r.email;
                  return (
                    <Fragment key={r.email + i}>
                      <tr className="border-t border-warm-100 hover:bg-warm-50/50">
                        <td className="px-3 py-2 whitespace-nowrap">{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-warm-600">{r.email}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{badge}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.geoCountry || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-warm-500">{fmt(r.createdAt)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => setOpenRow(open ? null : r.email)}
                            className="p-1 text-warm-400 hover:text-warm-800" title="Dettaglio invio email">
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-warm-50/60">
                          <td colSpan={6} className="px-4 py-3 text-xs text-warm-700">
                            <div className="space-y-1">
                              <div><strong>Stato:</strong> {st === "sent" ? "Email inviata correttamente" : st === "error" ? "Errore nell'invio" : "Non ancora inviata / in attesa"}</div>
                              <div><strong>Orario tentativo:</strong> {r.emailSentAt ? fmt(r.emailSentAt) : "—"}</div>
                              {st === "error" && <div className="text-red-700 break-all"><strong>Dettaglio errore:</strong> {r.emailError || "—"}</div>}
                              <div className="text-warm-400">IP: {r.ipAddress || "—"} · {[r.geoCity, r.geoRegion].filter(Boolean).join(", ") || "geo n/d"}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
