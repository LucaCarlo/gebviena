"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store, Users, Package, FolderOpen, Mail, Palette, Megaphone,
  Trophy, Globe, Image as ImageIcon, BarChart3, Eye,
  ArrowUpRight, Clock, Cloud, CloudOff, HardDrive,
  TrendingUp, Plus,
} from "lucide-react";

interface ViewsChartItem {
  label: string;
  views: number;
}

interface RecentProduct {
  id: string;
  name: string;
  coverImage: string | null;
  imageUrl: string;
  category: string;
  createdAt: string;
}

interface RecentProject {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
  createdAt: string;
}

interface DashboardStats {
  products: number;
  designers: number;
  projects: number;
  campaigns: number;
  awards: number;
  stores: number;
  agents: number;
  heroSlides: number;
  languages: number;
  mediaFiles: number;
  contacts: number;
  unreadContacts: number;
  newsletter: number;
  users: number;
  pageViews: number;
  todayViews: number;
  mediaSynced: number;
  mediaUnsynced: number;
  totalStorage: number;
  totalOriginalSize: number;
  savedBytes: number;
  viewsChart: ViewsChartItem[];
  recentProducts: RecentProduct[];
  recentProjects: RecentProject[];
}

interface RecentContact {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function formatBytes(bytes: number | null | undefined): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/contact").then((r) => r.json()),
    ]).then(([statsRes, contactsRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (contactsRes.success) setRecentContacts((contactsRes.data || []).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <div className="text-warm-400">Errore nel caricamento</div>;

  const maxViews = Math.max(...(stats.viewsChart || []).map((v) => v.views), 1);

  const mainCards = [
    { label: "Prodotti", count: stats.products, icon: Package, color: "bg-violet-500", href: "/admin/products" },
    { label: "Designer", count: stats.designers, icon: Palette, color: "bg-pink-500", href: "/admin/designers" },
    { label: "Progetti", count: stats.projects, icon: FolderOpen, color: "bg-orange-500", href: "/admin/projects" },
    { label: "Campagne", count: stats.campaigns, icon: Megaphone, color: "bg-cyan-500", href: "/admin/campaigns" },
    { label: "Premi", count: stats.awards, icon: Trophy, color: "bg-amber-500", href: "/admin/awards" },
  ];

  const secondaryCards = [
    { label: "Negozi", count: stats.stores, icon: Store, color: "bg-blue-500", href: "/admin/stores" },
    { label: "Agenti", count: stats.agents, icon: Users, color: "bg-emerald-500", href: "/admin/agents" },
    { label: "Hero Slides", count: stats.heroSlides, icon: ImageIcon, color: "bg-indigo-500", href: "/admin/hero" },
    { label: "Lingue", count: stats.languages, icon: Globe, color: "bg-teal-500", href: "/admin/languages" },
    { label: "Newsletter", count: stats.newsletter, icon: Mail, color: "bg-lime-600" },
  ];

  const savingsPercent = stats.totalOriginalSize > 0
    ? Math.round((stats.savedBytes / stats.totalOriginalSize) * 100)
    : 0;

  return (
    <div>
      {/* Header with welcome banner */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Dashboard</h1>
          <p className="text-sm text-warm-500 mt-1">Panoramica completa del sito GTV</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-400">
          <Clock size={14} />
          {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Unread messages alert */}
      {stats.unreadContacts > 0 && (
        <Link
          href="/admin/contacts"
          className="flex items-center gap-3 mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-3 hover:bg-red-100 transition-colors"
        >
          <Mail size={18} className="text-red-500" />
          <span className="text-sm font-medium text-red-700">
            {stats.unreadContacts} {stats.unreadContacts === 1 ? "messaggio non letto" : "messaggi non letti"}
          </span>
          <ArrowUpRight size={14} className="text-red-400 ml-auto" />
        </Link>
      )}

      {/* Top stats row: views + storage + optimization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sky-500 p-2 rounded-lg"><Eye size={16} className="text-white" /></div>
            <span className="text-xs text-warm-500 uppercase tracking-wider font-semibold">Visite oggi</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{stats.todayViews.toLocaleString("it-IT")}</p>
          <p className="text-xs text-warm-400 mt-1">{stats.pageViews.toLocaleString("it-IT")} totali</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-fuchsia-500 p-2 rounded-lg"><HardDrive size={16} className="text-white" /></div>
            <span className="text-xs text-warm-500 uppercase tracking-wider font-semibold">Storage Media</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{formatBytes(stats.totalStorage)}</p>
          <p className="text-xs text-warm-400 mt-1">{stats.mediaFiles} file totali</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500 p-2 rounded-lg"><Cloud size={16} className="text-white" /></div>
            <span className="text-xs text-warm-500 uppercase tracking-wider font-semibold">Sync Wasabi</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{stats.mediaSynced}</p>
          <div className="flex items-center gap-2 mt-1">
            {stats.mediaUnsynced > 0 ? (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <CloudOff size={10} /> {stats.mediaUnsynced} non sincronizzati
              </span>
            ) : (
              <span className="text-xs text-emerald-600">Tutto sincronizzato</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-500 p-2 rounded-lg"><TrendingUp size={16} className="text-white" /></div>
            <span className="text-xs text-warm-500 uppercase tracking-wider font-semibold">Ottimizzazione</span>
          </div>
          <p className="text-3xl font-bold text-warm-800">{savingsPercent}%</p>
          <p className="text-xs text-warm-400 mt-1">{formatBytes(stats.savedBytes)} risparmiati</p>
        </div>
      </div>

      {/* Page views chart */}
      {stats.viewsChart && stats.viewsChart.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800 flex items-center gap-2">
              <BarChart3 size={16} className="text-warm-400" /> Visite ultimi 7 giorni
            </h2>
            <Link href="/admin/analytics" className="text-xs text-warm-500 hover:text-warm-800 transition-colors">
              Dettagli →
            </Link>
          </div>
          <div className="flex items-end gap-2 h-32">
            {stats.viewsChart.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-warm-500 font-medium">{day.views}</span>
                <div
                  className="w-full bg-warm-800 rounded-t-md transition-all min-h-[4px]"
                  style={{ height: `${Math.max((day.views / maxViews) * 100, 4)}%` }}
                />
                <span className="text-[9px] text-warm-400 mt-1">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content cards */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Contenuti</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {mainCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl shadow-sm border border-warm-200 p-5 hover:shadow-md hover:border-warm-300 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon size={16} className="text-white" />
              </div>
              <ArrowUpRight size={14} className="text-warm-300 group-hover:text-warm-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-warm-800">{card.count}</p>
            <p className="text-xs text-warm-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Configuration cards */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Configurazione</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {secondaryCards.map((card) => {
          const inner = (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.color} p-2 rounded-lg`}>
                  <card.icon size={16} className="text-white" />
                </div>
                {"href" in card && card.href && <ArrowUpRight size={14} className="text-warm-300 group-hover:text-warm-500 transition-colors" />}
              </div>
              <p className="text-2xl font-bold text-warm-800">{card.count}</p>
              <p className="text-xs text-warm-500 mt-0.5">{card.label}</p>
            </>
          );
          const cls = "bg-white rounded-xl shadow-sm border border-warm-200 p-5 hover:shadow-md hover:border-warm-300 transition-all group";
          return "href" in card && card.href ? (
            <Link key={card.label} href={card.href as string} className={cls}>{inner}</Link>
          ) : (
            <div key={card.label} className={cls}>{inner}</div>
          );
        })}
      </div>

      {/* Bottom section: Recent activity + Messages + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent products */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800">Ultimi prodotti</h2>
            <Link href="/admin/products" className="text-xs text-warm-500 hover:text-warm-800 transition-colors">
              Tutti →
            </Link>
          </div>
          {stats.recentProducts.length === 0 ? (
            <p className="text-sm text-warm-400 py-4">Nessun prodotto</p>
          ) : (
            <div className="space-y-3">
              {stats.recentProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-3 py-2 border-b border-warm-100 last:border-0 hover:bg-warm-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-warm-100 flex-shrink-0 relative">
                    {(p.coverImage || p.imageUrl) ? (
                      <Image src={p.coverImage || p.imageUrl} alt={p.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={14} className="text-warm-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-warm-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-warm-400">{p.category}</p>
                  </div>
                  <span className="text-[10px] text-warm-400 flex-shrink-0">
                    {new Date(p.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent contacts */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800">Messaggi recenti</h2>
            <Link href="/admin/contacts" className="text-xs text-warm-500 hover:text-warm-800 transition-colors">
              Tutti →
            </Link>
          </div>
          {recentContacts.length === 0 ? (
            <p className="text-sm text-warm-400 py-4">Nessun messaggio</p>
          ) : (
            <div className="space-y-3">
              {recentContacts.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-2 border-b border-warm-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${c.isRead ? "bg-warm-300" : "bg-red-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-warm-800 truncate">{c.name}</p>
                    <p className="text-xs text-warm-500 truncate">{c.subject || c.email}</p>
                  </div>
                  <span className="text-[10px] text-warm-400 flex-shrink-0">
                    {new Date(c.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800">Azioni rapide</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: "Nuovo Prodotto", href: "/admin/products/new", icon: Package, color: "text-violet-600 bg-violet-50" },
              { label: "Nuovo Designer", href: "/admin/designers/new", icon: Palette, color: "text-pink-600 bg-pink-50" },
              { label: "Nuovo Progetto", href: "/admin/projects/new", icon: FolderOpen, color: "text-orange-600 bg-orange-50" },
              { label: "Nuova Campagna", href: "/admin/campaigns/new", icon: Megaphone, color: "text-cyan-600 bg-cyan-50" },
              { label: "Nuovo Negozio", href: "/admin/stores/new", icon: Store, color: "text-blue-600 bg-blue-50" },
              { label: "Carica Media", href: "/admin/media", icon: ImageIcon, color: "text-fuchsia-600 bg-fuchsia-50" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${action.color} hover:opacity-80 transition-opacity`}
              >
                <Plus size={14} />
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            ))}
          </div>

          {/* System info */}
          <div className="mt-4 pt-4 border-t border-warm-100">
            <div className="flex items-center justify-between text-[10px] text-warm-400">
              <span>Utenti admin</span>
              <span className="font-medium text-warm-600">{stats.users}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-warm-400 mt-1">
              <span>Lingue attive</span>
              <span className="font-medium text-warm-600">{stats.languages}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
