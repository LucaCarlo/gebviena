"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Package, Image as ImageIcon, KeyRound, Bell, ArrowRight, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  audience: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  catalog: FileText,
  price_list: Package,
  media: ImageIcon,
  credentials: KeyRound,
  info: Bell,
  update: Bell,
};
const TYPE_LABEL: Record<string, string> = {
  catalog: "Catalogo",
  price_list: "Listino prezzi",
  media: "Media",
  credentials: "Credenziali",
  info: "Informazione",
  update: "Aggiornamento",
};

function fmtDateTime(s: string): string {
  try {
    return new Date(s).toLocaleString("it-IT", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

export default function BachecaClient() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/area-professionisti/notifications", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setItems(j.data.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Marca automaticamente tutte come lette dopo 1.5s (l'utente le ha viste).
    const t = setTimeout(async () => {
      try {
        await fetch("/api/area-professionisti/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [load]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await fetch("/api/area-professionisti/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarking(false);
    }
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-warm-600">
          {loading ? "Caricamento…" : items.length === 0 ? "Nessuna novità per ora." : `${items.length} ${items.length === 1 ? "novità" : "novità totali"}${unread > 0 ? ` · ${unread} non ${unread === 1 ? "letta" : "lette"}` : ""}`}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-warm-700 hover:text-warm-900 border border-warm-300 hover:border-warm-900 px-3 py-1.5 disabled:opacity-50"
          >
            <CheckCheck size={12} /> Segna tutte come lette
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white border border-warm-200 p-5 animate-pulse">
              <div className="h-3 w-20 bg-warm-100 rounded mb-3" />
              <div className="h-5 w-3/5 bg-warm-100 rounded mb-2" />
              <div className="h-3 w-4/5 bg-warm-50 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-warm-200 p-10 text-center text-warm-500">
          Quando arrivano novità (nuovi cataloghi, listino aggiornato, modifiche alla dashboard, nuovi media) le troverai qui.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const cardBg = n.isRead ? "bg-white" : "bg-amber-50/40 border-amber-300";
            return (
              <div key={n.id} className={`border border-warm-200 ${cardBg} p-5`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-warm-500">
                    <Icon size={12} /> {TYPE_LABEL[n.type] || "Novità"}
                    {!n.isRead && <span className="inline-block w-2 h-2 rounded-full bg-red-500" aria-label="Non letta" />}
                  </div>
                  <span className="text-[11px] text-warm-400">{fmtDateTime(n.createdAt)}</span>
                </div>
                <h3 className="font-serif text-lg md:text-xl text-warm-900 mb-1">{n.title}</h3>
                {n.body && <p className="text-sm text-warm-700 leading-relaxed">{n.body}</p>}
                {n.link && (
                  <Link
                    href={n.link}
                    className="inline-flex items-center gap-1.5 mt-3 text-[12px] uppercase tracking-[0.15em] text-warm-900 hover:text-warm-700 border-b border-warm-300 hover:border-warm-900 pb-0.5"
                  >
                    Apri <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
