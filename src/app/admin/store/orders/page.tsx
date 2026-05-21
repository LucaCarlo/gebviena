"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ShoppingCart, Package, Truck, Check, XCircle, RotateCcw, Clock, AlertTriangle, Ban, Store, Undo2 } from "lucide-react";

type OrderStatus =
  | "PENDING"
  | "ABANDONED_CHECKOUT"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "PICKED_UP"
  | "RETURNED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  email: string;
  firstName: string;
  lastName: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paymentProvider: string | null;
  storePickup: boolean;
  customer: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  items: { id: string; quantity: number }[];
}

const STATUS_META: Record<OrderStatus, { label: string; cls: string; Icon: typeof Clock; group: "pending" | "failed" | "success" | "fulfillment" | "post" }> = {
  // ─── In attesa / iniziati ───
  PENDING:            { label: "In attesa di accredito bonifico", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock,    group: "pending" },
  ABANDONED_CHECKOUT: { label: "Checkout abbandonato",   cls: "bg-warm-100 text-warm-600 border-warm-200",         Icon: Ban,           group: "failed" },
  PAYMENT_FAILED:     { label: "Errore pagamento",       cls: "bg-red-50 text-red-700 border-red-200",             Icon: AlertTriangle, group: "failed" },
  CANCELLED:          { label: "Annullato dal cliente",  cls: "bg-warm-100 text-warm-600 border-warm-200",         Icon: XCircle,       group: "failed" },
  // ─── Pagati / in evasione ───
  PAID:               { label: "Pagato",                 cls: "bg-blue-50 text-blue-700 border-blue-200",          Icon: Check,         group: "success" },
  PROCESSING:         { label: "In preparazione",        cls: "bg-indigo-50 text-indigo-700 border-indigo-200",    Icon: Package,       group: "fulfillment" },
  SHIPPED:            { label: "Spedito",                cls: "bg-purple-50 text-purple-700 border-purple-200",    Icon: Truck,         group: "fulfillment" },
  // ─── Completati ───
  DELIVERED:          { label: "Consegnato",             cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Check,         group: "fulfillment" },
  PICKED_UP:          { label: "Ritirato in showroom",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Store,         group: "fulfillment" },
  // ─── Post-vendita ───
  RETURNED:           { label: "Reso",                   cls: "bg-orange-50 text-orange-700 border-orange-200",    Icon: Undo2,         group: "post" },
  REFUNDED:           { label: "Rimborsato",             cls: "bg-red-50 text-red-700 border-red-200",             Icon: RotateCcw,     group: "post" },
  PARTIALLY_REFUNDED: { label: "Rimb. parziale",         cls: "bg-orange-50 text-orange-700 border-orange-200",    Icon: RotateCcw,     group: "post" },
};

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/store/orders?${params}`).then((r) => r.json());
    if (res.success) setOrders(res.data);
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const totalBy = (s: OrderStatus) => orders.filter((o) => o.status === s).length;

  return (
    <div>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
            <ShoppingCart size={24} /> Ordini
          </h1>
          <p className="text-sm text-warm-500 mt-1">{orders.length} ordini visibili</p>
        </div>
      </header>

      {/* Riepilogo conteggi per gruppo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(() => {
          const groups = [
            { key: "in-attesa", label: "In attesa di pagamento", statuses: ["PENDING"] as OrderStatus[], cls: "bg-amber-50 text-amber-800 border-amber-200" },
            { key: "da-evadere", label: "Da evadere (pagati)",   statuses: ["PAID", "PROCESSING"] as OrderStatus[], cls: "bg-blue-50 text-blue-800 border-blue-200" },
            { key: "in-corso",  label: "Spediti / in corso",     statuses: ["SHIPPED"] as OrderStatus[], cls: "bg-purple-50 text-purple-800 border-purple-200" },
            { key: "completati", label: "Completati",            statuses: ["DELIVERED", "PICKED_UP"] as OrderStatus[], cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
            { key: "falliti",   label: "Falliti / annullati",    statuses: ["ABANDONED_CHECKOUT", "PAYMENT_FAILED", "CANCELLED"] as OrderStatus[], cls: "bg-warm-100 text-warm-700 border-warm-300" },
            { key: "post",      label: "Resi / rimborsi",        statuses: ["RETURNED", "REFUNDED", "PARTIALLY_REFUNDED"] as OrderStatus[], cls: "bg-orange-50 text-orange-800 border-orange-200" },
          ];
          return groups.filter((g) => g.statuses.some((s) => totalBy(s) > 0)).map((g) => {
            const count = g.statuses.reduce((acc, s) => acc + totalBy(s), 0);
            return (
              <div key={g.key} className={`rounded-lg border p-3 ${g.cls}`}>
                <div className="text-xs font-medium uppercase tracking-wider">{g.label}</div>
                <div className="text-2xl font-semibold mt-1">{count}</div>
              </div>
            );
          });
        })()}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-warm-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per numero ordine, email, nome…"
            className="w-full pl-9 pr-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
          className="px-3 py-2 border border-warm-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tutti gli stati</option>
          {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-warm-400">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-warm-400 bg-white rounded-lg border border-warm-200">
          Nessun ordine. Quando i clienti fanno un acquisto, compaiono qui.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-warm-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Numero</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-center">Articoli</th>
                <th className="px-4 py-3 text-right">Totale</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-left">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {orders.map((o) => {
                const meta = STATUS_META[o.status];
                const Icon = meta.Icon;
                const totalItems = o.items.reduce((s, it) => s + it.quantity, 0);
                return (
                  <tr key={o.id} className="hover:bg-warm-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/store/orders/${o.id}`} className="font-mono text-warm-900 hover:text-warm-700">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-warm-600">
                      {new Date(o.createdAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-warm-900">{o.firstName} {o.lastName}</div>
                      <div className="text-xs text-warm-500">{o.email}</div>
                      {!o.customer && <span className="text-[10px] text-warm-400 italic">guest</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-warm-600">{totalItems}</td>
                    <td className="px-4 py-3 text-right font-mono text-warm-900">{euro(o.totalCents, o.currency)}</td>
                    <td className="px-4 py-3">
                      {o.paymentProvider === "bonifico" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-700">Bonifico</span>
                      ) : o.paymentProvider === "stripe" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-700">Carta / Klarna</span>
                      ) : (
                        <span className="text-warm-400 text-[11px]">—</span>
                      )}
                      {o.storePickup && <span className="ml-1 inline-flex items-center text-[10px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-700">Ritiro</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${meta.cls}`}>
                        <Icon size={11} />
                        {meta.label}
                      </span>
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
