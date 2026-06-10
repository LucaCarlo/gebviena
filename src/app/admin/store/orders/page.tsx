"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ShoppingCart, Package, Truck, Check, XCircle, RotateCcw, Clock, AlertTriangle, Ban, Store, Undo2 } from "lucide-react";
import { formatNumber } from "@/lib/format";

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
  customer: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  items: { id: string; quantity: number }[];
}

const STATUS_META: Record<OrderStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  PENDING:            { label: "In attesa di accredito bonifico", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: Clock },
  ABANDONED_CHECKOUT: { label: "Checkout abbandonato",   cls: "bg-orange-50 text-orange-800 border-orange-200",      Icon: Ban },
  PAYMENT_FAILED:     { label: "Errore pagamento",       cls: "bg-red-50 text-red-800 border-red-200",               Icon: AlertTriangle },
  CANCELLED:          { label: "Annullato dal cliente",  cls: "bg-blue-50 text-blue-800 border-blue-200",            Icon: XCircle },
  PAID:               { label: "Pagato",                 cls: "bg-emerald-50 text-emerald-800 border-emerald-200",   Icon: Check },
  PROCESSING:         { label: "In preparazione",        cls: "bg-indigo-50 text-indigo-800 border-indigo-200",      Icon: Package },
  SHIPPED:            { label: "Spedito",                cls: "bg-purple-50 text-purple-800 border-purple-200",      Icon: Truck },
  DELIVERED:          { label: "Consegnato",             cls: "bg-emerald-50 text-emerald-800 border-emerald-200",   Icon: Check },
  PICKED_UP:          { label: "Ritirato in showroom",   cls: "bg-emerald-50 text-emerald-800 border-emerald-200",   Icon: Store },
  RETURNED:           { label: "Reso",                   cls: "bg-blue-50 text-blue-800 border-blue-200",            Icon: Undo2 },
  REFUNDED:           { label: "Rimborsato",             cls: "bg-blue-50 text-blue-800 border-blue-200",            Icon: RotateCcw },
  PARTIALLY_REFUNDED: { label: "Rimb. parziale",         cls: "bg-blue-50 text-blue-800 border-blue-200",            Icon: RotateCcw },
};

// Difensivo: se per qualunque motivo arriva uno stato sconosciuto, mostro un
// fallback neutro invece di crashare la pagina.
const FALLBACK_META = { label: "Stato sconosciuto", cls: "bg-warm-100 text-warm-700 border-warm-200", Icon: Clock };

// Stati visibili in questa pagina (ordini "veri"). I checkout abbandonati e
// gli ordini annullati vivono in pagine dedicate (Carrelli abbandonati) e
// non devono comparire qui.
const VISIBLE_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED",
  "PICKED_UP", "RETURNED", "REFUNDED", "PARTIALLY_REFUNDED", "PAYMENT_FAILED",
];
const VISIBLE_SET = new Set<OrderStatus>(VISIBLE_STATUSES);

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

type PeriodKey = "today" | "7d" | "month" | "year" | "all" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Oggi",
  "7d": "Ultimi 7 giorni",
  month: "Questo mese",
  year: "Anno in corso",
  all: "Tutto",
  custom: "Personalizzato",
};

interface RevenueStats {
  totalSalesCents: number;
  totalSalesCount: number;
  cancelledRefundedCents: number;
  cancelledRefundedCount: number;
  pendingBonificoCount: number;
  pendingBonificoCents: number;
  daEvadereCount: number;
  shippedCount: number;
  consegnatiCount: number;
}

function rangeForPeriod(p: PeriodKey, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  if (p === "all") return { from: null, to: null };
  if (p === "custom") return { from: customFrom || null, to: customTo || null };
  const now = new Date();
  if (p === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: null };
  }
  if (p === "7d") {
    const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: null };
  }
  if (p === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: start.toISOString(), to: null };
  }
  if (p === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { from: start.toISOString(), to: null };
  }
  return { from: null, to: null };
}

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [stats, setStats] = useState<RevenueStats | null>(null);

  const { from, to } = rangeForPeriod(period, customFrom, customTo);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/store/orders?${params}`).then((r) => r.json());
    if (res.success) {
      // Escludi i checkout abbandonati e gli annullati: hanno pagine dedicate.
      const filtered: OrderListItem[] = (res.data as OrderListItem[]).filter((o) => VISIBLE_SET.has(o.status));
      setOrders(filtered);
    }
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Stats aggregate (filtro periodo) — gli stati operativi (Da evadere/Spediti/
  // Consegnati) sono globali, gli importi a destra sono filtrati per periodo.
  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/store/orders/stats?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch(() => { /* silent */ });
  }, [from, to]);

  const eurFmt = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

  return (
    <div>
      <header className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
            <ShoppingCart size={24} /> Ordini
          </h1>
          <p className="text-sm text-warm-500 mt-1">{orders.length} ordini visibili</p>
        </div>

        {/* Selettore periodo: filtra solo i 3 box importi a destra (Totale
            vendite, In attesa bonifico, Annullati/Rimborsati). I 3 box stato a
            sinistra (Da evadere/Spediti/Consegnati) restano sempre live. */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="px-3 py-1.5 border border-warm-200 rounded-lg text-sm bg-white"
          >
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
              <option key={k} value={k}>{PERIOD_LABELS[k]}</option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 py-1.5 border border-warm-200 rounded-lg text-sm bg-white" />
              <span className="text-xs text-warm-500">→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2 py-1.5 border border-warm-200 rounded-lg text-sm bg-white" />
            </>
          )}
        </div>
      </header>

      {/* Riepilogo: SINISTRA 3 box piccoli con conteggi operativi (stato live);
          DESTRA 3 box grandi con importi (performance del periodo). Su mobile
          si impilano in colonna. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-6">
        {/* ── SINISTRA: stati operativi ── */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-2">
          <div className={`rounded-lg border px-3 py-2 bg-blue-50 text-blue-800 border-blue-200 ${stats && stats.daEvadereCount === 0 ? "opacity-60" : ""}`}>
            <div className="text-[10px] font-medium uppercase tracking-wider">Da evadere</div>
            <div className="text-xl font-semibold mt-0.5 leading-tight">{stats?.daEvadereCount != null ? formatNumber(stats.daEvadereCount) : "—"}</div>
            <div className="text-[10px] text-blue-700 leading-tight">pagati, da spedire</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 bg-purple-50 text-purple-800 border-purple-200 ${stats && stats.shippedCount === 0 ? "opacity-60" : ""}`}>
            <div className="text-[10px] font-medium uppercase tracking-wider">Spediti</div>
            <div className="text-xl font-semibold mt-0.5 leading-tight">{stats?.shippedCount != null ? formatNumber(stats.shippedCount) : "—"}</div>
            <div className="text-[10px] text-purple-700 leading-tight">in transito</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 bg-emerald-50 text-emerald-800 border-emerald-200 ${stats && stats.consegnatiCount === 0 ? "opacity-60" : ""}`}>
            <div className="text-[10px] font-medium uppercase tracking-wider">Consegnati</div>
            <div className="text-xl font-semibold mt-0.5 leading-tight">{stats?.consegnatiCount != null ? formatNumber(stats.consegnatiCount) : "—"}</div>
            <div className="text-[10px] text-emerald-700 leading-tight">consegnati al cliente</div>
          </div>
        </div>

        {/* ── DESTRA: importi grandi del periodo ── */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border px-4 py-3 bg-emerald-100/60 text-emerald-900 border-emerald-300">
            <div className="text-[11px] font-medium uppercase tracking-wider">
              Totale vendite{period !== "all" && ` · ${PERIOD_LABELS[period].toLowerCase()}`}
            </div>
            <div className="text-2xl md:text-[26px] font-semibold mt-1 leading-tight tabular-nums">
              {stats ? eurFmt(stats.totalSalesCents) : "—"}
            </div>
            <div className="text-[11px] text-emerald-700 leading-tight mt-0.5">
              {formatNumber(stats?.totalSalesCount ?? 0)} {stats?.totalSalesCount === 1 ? "ordine" : "ordini"}
            </div>
          </div>

          <div className={`rounded-lg border px-4 py-3 bg-amber-50 text-amber-900 border-amber-200 ${stats && stats.pendingBonificoCount === 0 ? "opacity-60" : ""}`}>
            <div className="text-[11px] font-medium uppercase tracking-wider">In attesa di bonifico</div>
            <div className="text-2xl md:text-[26px] font-semibold mt-1 leading-tight tabular-nums">
              {stats ? eurFmt(stats.pendingBonificoCents) : "—"}
            </div>
            <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
              {formatNumber(stats?.pendingBonificoCount ?? 0)} {stats?.pendingBonificoCount === 1 ? "ordine" : "ordini"}
            </div>
          </div>

          <div className={`rounded-lg border px-4 py-3 bg-red-50 text-red-900 border-red-200 ${stats && stats.cancelledRefundedCount === 0 ? "opacity-60" : ""}`}>
            <div className="text-[11px] font-medium uppercase tracking-wider">Annullati / Rimborsati</div>
            <div className="text-2xl md:text-[26px] font-semibold mt-1 leading-tight tabular-nums">
              {stats ? eurFmt(stats.cancelledRefundedCents) : "—"}
            </div>
            <div className="text-[11px] text-red-700 leading-tight mt-0.5">
              {formatNumber(stats?.cancelledRefundedCount ?? 0)} {stats?.cancelledRefundedCount === 1 ? "ordine" : "ordini"} (cliente o GTV)
            </div>
          </div>
        </div>
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
          {VISIBLE_STATUSES.map((s) => (
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
                <th className="px-4 py-3 text-left">Articoli</th>
                <th className="px-4 py-3 text-right">Totale</th>
                <th className="px-4 py-3 text-left">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {orders.map((o) => {
                const meta = STATUS_META[o.status] || FALLBACK_META;
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
                    <td className="px-4 py-3 text-warm-600">{formatNumber(totalItems)}</td>
                    <td className="px-4 py-3 text-right font-mono text-warm-900">{euro(o.totalCents, o.currency)}</td>
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
