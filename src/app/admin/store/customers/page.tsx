"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Users, ShoppingCart } from "lucide-react";

interface CustomerListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isGuest: boolean;
  isActive: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  ordersCount: number;
  addressesCount: number;
  lifetimeCents: number;
  currency: string;
}

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function StoreCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [hasOrders, setHasOrders] = useState<"" | "true" | "false">("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (hasOrders) params.set("hasOrders", hasOrders);
    const res = await fetch(`/api/store/customers?${params}`).then((r) => r.json());
    if (res.success) setCustomers(res.data);
    setLoading(false);
  }, [q, hasOrders]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
            <Users size={24} /> Clienti Shop
          </h1>
          <p className="text-sm text-warm-500 mt-1">
            {customers.length} clienti · {customers.filter((c) => !c.isGuest).length} registrati · {customers.filter((c) => c.isGuest).length} guest
          </p>
        </div>
      </header>

      <div className="bg-white rounded-lg border border-warm-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per email, nome, telefono…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={hasOrders}
          onChange={(e) => setHasOrders(e.target.value as "" | "true" | "false")}
          className="px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tutti</option>
          <option value="true">Solo con ordini</option>
          <option value="false">Senza ordini</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun cliente. I clienti vengono creati automaticamente al primo checkout.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Contatti</th>
                <th className="px-4 py-3 text-center">Ordini</th>
                <th className="px-4 py-3 text-right">Speso totale</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Registrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {customers.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={c.id} className="hover:bg-warm-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/store/customers/${c.id}`} className="font-medium text-warm-900 hover:text-warm-700">
                        {fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-warm-700 font-mono text-xs">{c.email}</div>
                      {c.phone && <div className="text-warm-500 text-xs">☎ {c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.ordersCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-warm-700">
                          <ShoppingCart size={12} /> {c.ordersCount}
                        </span>
                      ) : (
                        <span className="text-warm-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-warm-900">
                      {c.lifetimeCents > 0 ? euro(c.lifetimeCents, c.currency) : <span className="text-warm-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.isGuest ? (
                        <span className="text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded">Guest</span>
                      ) : (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Registrato</span>
                      )}
                      {c.marketingOptIn && (
                        <span className="ml-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">📧</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-warm-500">
                      {new Date(c.createdAt).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
