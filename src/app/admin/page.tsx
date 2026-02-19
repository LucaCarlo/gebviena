"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Store, Users, Package, FolderOpen, Mail, Palette, Megaphone,
  Trophy, Layers, Globe, Image as ImageIcon, BarChart3, Eye,
  UserCog, ArrowUpRight, Clock,
} from "lucide-react";

interface DashboardStats {
  products: number;
  designers: number;
  projects: number;
  campaigns: number;
  awards: number;
  stores: number;
  agents: number;
  finishes: number;
  heroSlides: number;
  languages: number;
  mediaFiles: number;
  contacts: number;
  unreadContacts: number;
  newsletter: number;
  users: number;
  pageViews: number;
  todayViews: number;
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
    { label: "Finiture", count: stats.finishes, icon: Layers, color: "bg-rose-500", href: "/admin/finishes" },
    { label: "Hero Slides", count: stats.heroSlides, icon: ImageIcon, color: "bg-indigo-500", href: "/admin/hero" },
    { label: "Lingue", count: stats.languages, icon: Globe, color: "bg-teal-500", href: "/admin/languages" },
  ];

  const systemCards = [
    { label: "Media", count: stats.mediaFiles, icon: ImageIcon, color: "bg-fuchsia-500", href: "/admin/media" },
    { label: "Utenti", count: stats.users, icon: UserCog, color: "bg-slate-500", href: "/admin/users" },
    { label: "Newsletter", count: stats.newsletter, icon: Mail, color: "bg-lime-600" },
    { label: "Visite oggi", count: stats.todayViews, icon: Eye, color: "bg-sky-500", href: "/admin/analytics" },
    { label: "Visite totali", count: stats.pageViews, icon: BarChart3, color: "bg-warm-600", href: "/admin/analytics" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-warm-800">Dashboard</h1>
          <p className="text-sm text-warm-500 mt-1">Panoramica completa del sito</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-400">
          <Clock size={14} />
          {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Messaggi non letti */}
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

      {/* Main content cards */}
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

      {/* Secondary cards */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Configurazione</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {secondaryCards.map((card) => (
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

      {/* System cards */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-3">Sistema</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {systemCards.map((card) => {
          const inner = (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.color} p-2 rounded-lg`}>
                  <card.icon size={16} className="text-white" />
                </div>
                {card.href && <ArrowUpRight size={14} className="text-warm-300 group-hover:text-warm-500 transition-colors" />}
              </div>
              <p className="text-2xl font-bold text-warm-800">{card.count}</p>
              <p className="text-xs text-warm-500 mt-0.5">{card.label}</p>
            </>
          );
          const cls = "bg-white rounded-xl shadow-sm border border-warm-200 p-5 hover:shadow-md hover:border-warm-300 transition-all group";
          return card.href ? (
            <Link key={card.label} href={card.href} className={cls}>{inner}</Link>
          ) : (
            <div key={card.label} className={cls}>{inner}</div>
          );
        })}
      </div>

      {/* Recent contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800">Messaggi recenti</h2>
            <Link href="/admin/contacts" className="text-xs text-warm-500 hover:text-warm-800 transition-colors">
              Vedi tutti →
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
                  <span className="text-xs text-warm-400 flex-shrink-0">
                    {new Date(c.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-warm-800">Azioni rapide</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg ${action.color} hover:opacity-80 transition-opacity`}
              >
                <action.icon size={16} />
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
