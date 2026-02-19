"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, Globe, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  uniquePages: number;
  avgDailyViews: number;
  topPages: { path: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  recentViews: { id: string; path: string; referrer: string | null; createdAt: string }[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((res) => { setData(res.data || null); setLoading(false); });
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-warm-800 mb-8">Analisi Traffico</h1>
        <div className="text-warm-400">Caricamento...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-warm-800 mb-8">Analisi Traffico</h1>
        <div className="text-center py-12 text-warm-400">Nessun dato disponibile</div>
      </div>
    );
  }

  const maxDailyViews = Math.max(...(data.dailyViews?.map((d) => d.count) || [1]), 1);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Analisi Traffico</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warm-100 rounded-lg">
              <Eye size={18} className="text-warm-600" />
            </div>
            <span className="text-sm text-warm-500">Visite totali</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{data.totalViews.toLocaleString("it-IT")}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warm-100 rounded-lg">
              <TrendingUp size={18} className="text-warm-600" />
            </div>
            <span className="text-sm text-warm-500">Visite oggi</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{data.todayViews.toLocaleString("it-IT")}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warm-100 rounded-lg">
              <Globe size={18} className="text-warm-600" />
            </div>
            <span className="text-sm text-warm-500">Pagine uniche</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{data.uniquePages.toLocaleString("it-IT")}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warm-100 rounded-lg">
              <BarChart3 size={18} className="text-warm-600" />
            </div>
            <span className="text-sm text-warm-500">Media visite/giorno</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{data.avgDailyViews.toLocaleString("it-IT")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top pages */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-200">
            <h2 className="text-lg font-semibold text-warm-800">Pagine piu visitate</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Pagina</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Visite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {(data.topPages || []).slice(0, 10).map((page, i) => (
                <tr key={i} className="hover:bg-warm-50 transition-colors">
                  <td className="px-6 py-3 text-warm-800 font-mono text-xs">{page.path}</td>
                  <td className="px-6 py-3 text-right text-warm-600">{page.count.toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data.topPages || data.topPages.length === 0) && (
            <div className="text-center py-8 text-warm-400">Nessun dato</div>
          )}
        </div>

        {/* Daily views bar chart */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-200">
            <h2 className="text-lg font-semibold text-warm-800">Visite ultimi 30 giorni</h2>
          </div>
          <div className="p-6 space-y-1.5 max-h-[400px] overflow-y-auto">
            {(data.dailyViews || []).map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-warm-500 w-12 shrink-0 text-right">{formatDate(day.date)}</span>
                <div className="flex-1 h-6 bg-warm-50 rounded overflow-hidden">
                  <div
                    className="h-full bg-warm-800 rounded transition-all"
                    style={{ width: `${Math.max((day.count / maxDailyViews) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs text-warm-600 w-10 shrink-0">{day.count}</span>
              </div>
            ))}
            {(!data.dailyViews || data.dailyViews.length === 0) && (
              <div className="text-center py-8 text-warm-400">Nessun dato</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent views */}
      <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-800">Visite recenti</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-50 border-b border-warm-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Pagina</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Referrer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-warm-600 uppercase tracking-wider">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {(data.recentViews || []).slice(0, 20).map((view) => (
              <tr key={view.id} className="hover:bg-warm-50 transition-colors">
                <td className="px-6 py-3 text-warm-800 font-mono text-xs">{view.path}</td>
                <td className="px-6 py-3 text-warm-500 text-xs truncate max-w-[200px]">{view.referrer || "Diretto"}</td>
                <td className="px-6 py-3 text-warm-500 text-xs">{formatDateTime(view.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data.recentViews || data.recentViews.length === 0) && (
          <div className="text-center py-8 text-warm-400">Nessun dato</div>
        )}
      </div>
    </div>
  );
}
