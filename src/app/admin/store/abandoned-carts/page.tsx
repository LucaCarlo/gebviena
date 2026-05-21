"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, ShoppingCart, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface CartListItem {
  id: string;
  sessionId: string;
  email: string | null;
  customerId: string | null;
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
  const [minAgeMin, setMinAgeMin] = useState(0);
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
        ...(minAgeMin > 0 ? { minAgeMin: String(minAgeMin) } : {}),
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
  }, [q, minAgeMin, page]);

  useEffect(() => {
    fetchCarts();
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-warm-900 flex items-center gap-3">
            <ShoppingCart size={26} className="text-warm-700" />
            Carrelli abbandonati
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            Clienti che hanno aggiunto prodotti al carrello e non hanno finalizzato l&apos;ordine. Non sono ordini, non hanno stato.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-warm-200 rounded p-4">
          <div className="text-xs text-warm-500 uppercase tracking-wider">Totale carrelli</div>
          <div className="text-2xl font-light text-warm-900 mt-1">{stats.totalCarts}</div>
        </div>
        <div className="bg-white border border-warm-200 rounded p-4">
          <div className="text-xs text-warm-500 uppercase tracking-wider">Valore complessivo</div>
          <div className="text-2xl font-light text-warm-900 mt-1">{eur(stats.totalValueCents)}</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cerca email, articolo, sessionId…"
            className="w-full pl-9 pr-3 py-2 border border-warm-300 rounded text-sm focus:border-warm-700 outline-none"
          />
        </div>
        <select
          value={minAgeMin}
          onChange={(e) => { setMinAgeMin(parseInt(e.target.value, 10)); setPage(1); }}
          className="px-3 py-2 border border-warm-300 rounded text-sm bg-white focus:border-warm-700 outline-none"
        >
          <option value="0">Tutti i carrelli</option>
          <option value="30">Fermi da almeno 30 min</option>
          <option value="60">Fermi da almeno 1 ora</option>
          <option value="360">Fermi da almeno 6 ore</option>
          <option value="1440">Fermi da almeno 24 ore</option>
        </select>
      </div>

      {/* Tabella */}
      {loading ? (
        <div className="text-center py-16 text-warm-500">
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
          Caricamento…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm">{error}</div>
      ) : carts.length === 0 ? (
        <div className="text-center py-16 text-warm-500 bg-warm-50 border border-warm-200 rounded">
          <ShoppingCart size={28} className="mx-auto mb-3 text-warm-300" />
          Nessun carrello abbandonato con i filtri attuali.
        </div>
      ) : (
        <div className="bg-white border border-warm-200 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 border-b border-warm-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Cliente</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Articoli</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Subtotale</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Lingua</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Ultimo aggiornamento</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider">Creato</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-warm-600 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {carts.map((c) => {
                const isOpen = openRow === c.id;
                return (
                  <>
                    <tr key={c.id} className="border-b border-warm-100 hover:bg-warm-50/40">
                      <td className="px-2 py-2">
                        <button onClick={() => setOpenRow(isOpen ? null : c.id)} className="p-1 hover:bg-warm-100 rounded">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        {c.email ? (
                          <div>
                            <div className="text-warm-900">{c.email}</div>
                            <div className="text-[11px] text-warm-400 font-mono">{c.sessionId.slice(0, 12)}…</div>
                          </div>
                        ) : (
                          <div className="text-warm-500 italic">
                            ospite
                            <div className="text-[11px] text-warm-400 font-mono">{c.sessionId.slice(0, 12)}…</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-warm-900 font-medium">{c.itemCount}</td>
                      <td className="px-4 py-2 text-right text-warm-900 font-mono">{eur(c.subtotalCents, c.currency)}</td>
                      <td className="px-4 py-2 text-warm-700 uppercase text-xs">{c.language || "—"}</td>
                      <td className="px-4 py-2 text-warm-700">{fmtAge(c.updatedAt)}</td>
                      <td className="px-4 py-2 text-warm-500 text-xs">{new Date(c.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => deleteCart(c.id)} className="text-warm-400 hover:text-red-600 p-1" title="Elimina">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={c.id + "-d"} className="bg-warm-50/40 border-b border-warm-100">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="text-xs uppercase tracking-wider text-warm-500 mb-3">Dettaglio carrello</div>
                          <div className="grid md:grid-cols-2 gap-4 mb-4 text-xs text-warm-600">
                            <div><span className="text-warm-500">SessionId:</span> <span className="font-mono">{c.sessionId}</span></div>
                            {c.ipAddress && <div><span className="text-warm-500">IP:</span> <span className="font-mono">{c.ipAddress}</span></div>}
                            {c.customerId && <div><span className="text-warm-500">CustomerId:</span> <span className="font-mono">{c.customerId}</span></div>}
                          </div>
                          <div className="space-y-2">
                            {c.items.map((it, i) => (
                              <div key={i} className="flex items-center gap-3 bg-white border border-warm-200 rounded p-2">
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
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-warm-300 rounded text-sm disabled:opacity-40">Precedente</button>
          <span className="px-3 py-1.5 text-sm text-warm-600">Pagina {page} di {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-warm-300 rounded text-sm disabled:opacity-40">Successiva</button>
        </div>
      )}
    </div>
  );
}
