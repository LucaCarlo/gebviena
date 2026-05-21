"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, Search, ShoppingBag, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface CartListItem {
  id: string;
  sessionId: string;
  email: string | null;
  customerId: string | null;
  customer: { firstName: string | null; lastName: string | null; email: string } | null;
  itemCount: number;
  subtotalCents: number;
  currency: string;
  language: string | null;
  ipAddress: string | null;
  updatedAt: string;
  createdAt: string;
  items: Array<{
    productName: string;
    productSlug: string;
    sku: string;
    quantity: number;
    priceCents: number;
    coverImage: string | null;
  }>;
}

const eur = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function fmtAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} g fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}

export default function AbandonedCartsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carts, setCarts] = useState<CartListItem[]>([]);
  const [stats, setStats] = useState<{ totalCarts: number; totalValueCents: number }>({ totalCarts: 0, totalValueCents: 0 });
  const [q, setQ] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "30",
        ...(q ? { q } : {}),
        ...(maxAgeDays > 0 ? { maxAgeDays: String(maxAgeDays) } : {}),
      });
      const res = await fetch(`/api/admin/store/abandoned-carts?${params}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Errore caricamento");
        return;
      }
      setCarts(data.data || []);
      setStats(data.stats || { totalCarts: 0, totalValueCents: 0 });
      setPages(data.pagination?.pages || 1);
    } catch {
      setError("Errore di rete");
    } finally {
      setLoading(false);
    }
  }, [q, maxAgeDays, page]);

  useEffect(() => {
    const t = setTimeout(fetchCarts, 200);
    return () => clearTimeout(t);
  }, [fetchCarts]);

  const deleteCart = async (id: string) => {
    if (!confirm("Eliminare questo carrello dalla lista?")) return;
    try {
      const res = await fetch("/api/admin/store/abandoned-carts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCarts();
      } else {
        alert(data.error || "Errore eliminazione");
      }
    } catch {
      alert("Errore di rete");
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
            <ShoppingBag size={24} /> Carrelli abbandonati
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {stats.totalCarts} carrelli ·{" "}
            <span className="text-warm-700 font-medium">{eur(stats.totalValueCents)}</span> valore complessivo non finalizzato
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-warm-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cerca email, articolo, sessionId…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={maxAgeDays}
          onChange={(e) => { setMaxAgeDays(parseInt(e.target.value, 10)); setPage(1); }}
          className="px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="0">Tutti i tempi</option>
          <option value="1">Ultime 24 ore</option>
          <option value="7">Ultimi 7 giorni</option>
          <option value="14">Ultime 2 settimane</option>
          <option value="30">Ultimo mese</option>
        </select>
      </div>

      {/* Tabella */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">{error}</div>
      ) : carts.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun carrello abbandonato con i filtri attuali.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-center">Articoli</th>
                <th className="px-4 py-3 text-right">Subtotale</th>
                <th className="px-4 py-3 text-left">Lingua</th>
                <th className="px-4 py-3 text-left">Ultimo aggiornamento</th>
                <th className="px-4 py-3 text-left">Creato</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {carts.map((c) => {
                const isOpen = openRow === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="hover:bg-warm-50/50">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenRow(isOpen ? null : c.id)} className="p-1 hover:bg-warm-100 rounded">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {c.customer ? (
                          <div>
                            <div className="text-warm-900">
                              {[c.customer.firstName, c.customer.lastName].filter(Boolean).join(" ") || c.customer.email}
                            </div>
                            <div className="text-xs text-warm-500">{c.customer.email}</div>
                          </div>
                        ) : c.email ? (
                          <div>
                            <div className="text-warm-900">{c.email}</div>
                            <div className="text-[11px] text-warm-400 italic">ospite (email da checkout)</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-warm-500 italic">Ospite</div>
                            <div className="text-[11px] text-warm-400 font-mono">{c.sessionId.slice(0, 12)}…</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-warm-900 font-medium">{c.itemCount}</td>
                      <td className="px-4 py-3 text-right text-warm-900 font-mono">{eur(c.subtotalCents, c.currency)}</td>
                      <td className="px-4 py-3 text-warm-700 uppercase text-xs">{c.language || "—"}</td>
                      <td className="px-4 py-3 text-warm-700">{fmtAge(c.updatedAt)}</td>
                      <td className="px-4 py-3 text-warm-500 text-xs">
                        {new Date(c.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteCart(c.id)} className="text-warm-400 hover:text-red-600 p-1" title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-warm-50/40">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="text-xs uppercase tracking-wider text-warm-500 mb-3">Dettaglio carrello</div>
                          <div className="grid md:grid-cols-3 gap-4 mb-4 text-xs text-warm-600">
                            <div><span className="text-warm-500">SessionId:</span> <span className="font-mono">{c.sessionId}</span></div>
                            {c.ipAddress && <div><span className="text-warm-500">IP:</span> <span className="font-mono">{c.ipAddress}</span></div>}
                            {c.customerId && <div><span className="text-warm-500">CustomerId:</span> <span className="font-mono">{c.customerId}</span></div>}
                          </div>
                          <div className="space-y-2">
                            {c.items.map((it, i) => (
                              <div key={i} className="flex items-center gap-3 bg-white border border-warm-200 rounded-lg p-2">
                                {it.coverImage && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={it.coverImage} alt={it.productName} className="w-12 h-12 object-cover rounded" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-warm-900 truncate">{it.productName || "(senza nome)"}</div>
                                  <div className="text-xs text-warm-500 truncate">SKU {it.sku} · slug {it.productSlug}</div>
                                </div>
                                <div className="text-sm text-warm-700">×{it.quantity}</div>
                                <div className="text-sm text-warm-900 font-mono w-24 text-right">{eur(it.priceCents * it.quantity, c.currency)}</div>
                              </div>
                            ))}
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
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-warm-200 rounded-lg text-sm disabled:opacity-40">
            Precedente
          </button>
          <span className="px-3 py-1.5 text-sm text-warm-600">Pagina {page} di {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-warm-200 rounded-lg text-sm disabled:opacity-40">
            Successiva
          </button>
        </div>
      )}
    </div>
  );
}
