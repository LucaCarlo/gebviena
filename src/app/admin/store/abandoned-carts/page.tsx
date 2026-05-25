"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ShoppingBag, Clock, AlertTriangle, Ban, XCircle } from "lucide-react";
import { humanizeStripeError } from "@/lib/stripe-error-labels";

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
  paymentMethodType: string | null;
  paymentErrorMessage: string | null;
  storePickup: boolean;
  customer: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  items: { id: string; quantity: number }[];
}

// Solo gli stati "pre-pagamento" che vanno qui:
// - ABANDONED_CHECKOUT (compilato form ma uscito prima di cliccare paga)
// - PAYMENT_FAILED (Stripe ha rifiutato la carta)
// - PENDING via Stripe (cliente non ha completato il pagamento)
// NB: PENDING+bonifico e CANCELLED stanno in /admin/store/orders (sono ordini finalizzati).
const PENDING_STATUSES: OrderStatus[] = ["ABANDONED_CHECKOUT", "PENDING", "PAYMENT_FAILED"];

const STATUS_META: Record<OrderStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  PENDING:            { label: "In attesa di accredito bonifico", cls: "bg-amber-50 text-amber-800 border-amber-200",  Icon: Clock },
  ABANDONED_CHECKOUT: { label: "Checkout abbandonato",            cls: "bg-orange-50 text-orange-800 border-orange-200", Icon: Ban },
  PAYMENT_FAILED:     { label: "Errore pagamento",                cls: "bg-red-50 text-red-800 border-red-200",          Icon: AlertTriangle },
  CANCELLED:          { label: "Annullato dal cliente",           cls: "bg-blue-50 text-blue-800 border-blue-200",       Icon: XCircle },
  // Gli stati pagati non dovrebbero apparire qui ma li dichiariamo per typing
  PAID:               { label: "Pagato",            cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: Clock },
  PROCESSING:         { label: "In preparazione",   cls: "bg-indigo-50 text-indigo-800 border-indigo-200",    Icon: Clock },
  SHIPPED:            { label: "Spedito",           cls: "bg-purple-50 text-purple-800 border-purple-200",    Icon: Clock },
  DELIVERED:          { label: "Consegnato",        cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: Clock },
  PICKED_UP:          { label: "Ritirato",          cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: Clock },
  RETURNED:           { label: "Reso",              cls: "bg-blue-50 text-blue-800 border-blue-200",          Icon: Clock },
  REFUNDED:           { label: "Rimborsato",        cls: "bg-blue-50 text-blue-800 border-blue-200",          Icon: Clock },
  PARTIALLY_REFUNDED: { label: "Rimb. parziale",    cls: "bg-blue-50 text-blue-800 border-blue-200",          Icon: Clock },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "Carta",
  klarna: "Klarna",
  link: "Link",
  paypal: "PayPal",
  amazon_pay: "Amazon Pay",
  sepa_debit: "SEPA",
  bancontact: "Bancontact",
  ideal: "iDEAL",
  giropay: "Giropay",
  sofort: "Sofort",
  eps: "EPS",
  p24: "P24",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cashapp: "Cash App",
  alipay: "Alipay",
  wechat_pay: "WeChat Pay",
};
function paymentMethodLabel(o: { paymentProvider: string | null; paymentMethodType: string | null }): string | null {
  if (o.paymentProvider === "bonifico") return "Bonifico";
  if (o.paymentMethodType) return PAYMENT_METHOD_LABEL[o.paymentMethodType] || o.paymentMethodType;
  if (o.paymentProvider === "stripe") return "Stripe (in attesa)";
  return null;
}

// PENDING via stripe = pagamento mai effettuato; PENDING via bonifico = aspettiamo accredito
function statusLabel(o: { status: OrderStatus; paymentProvider: string | null }): string {
  if (o.status === "PENDING" && o.paymentProvider !== "bonifico") return "Pagamento non effettuato";
  return STATUS_META[o.status].label;
}

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function AbandonedCartsPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("scope", "pending");
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    params.set("take", "500");
    const res = await fetch(`/api/store/orders?${params}`).then((r) => r.json());
    if (res.success) setOrders(res.data);
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const totalBy = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const pendingStripe = orders.filter((o) => o.status === "PENDING" && o.paymentProvider !== "bonifico").length;
  const totalValueCents = orders.reduce((s, o) => s + (o.totalCents || 0), 0);
  const eurFmt = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

  return (
    <div>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 flex items-center gap-2">
            <ShoppingBag size={24} /> Carrelli abbandonati
          </h1>
          <p className="text-sm text-warm-500 mt-1">{orders.length} ordini non finalizzati</p>
        </div>
      </header>

      {/* Riepilogo conteggi compatti */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div className={`rounded-lg border px-3 py-2 bg-orange-50 text-orange-800 border-orange-200 ${totalBy("ABANDONED_CHECKOUT") === 0 ? "opacity-50" : ""}`}>
          <div className="text-[10px] font-medium uppercase tracking-wider">Checkout abbandonati</div>
          <div className="text-lg font-semibold mt-0.5 leading-tight">{totalBy("ABANDONED_CHECKOUT")}</div>
          <div className="text-[10px] text-orange-700 leading-tight">form parziale</div>
        </div>
        <div className={`rounded-lg border px-3 py-2 bg-amber-50 text-amber-800 border-amber-200 ${pendingStripe === 0 ? "opacity-50" : ""}`}>
          <div className="text-[10px] font-medium uppercase tracking-wider">Pagamento non effettuato</div>
          <div className="text-lg font-semibold mt-0.5 leading-tight">{pendingStripe}</div>
          <div className="text-[10px] text-amber-700 leading-tight">Stripe non finalizzato</div>
        </div>
        <div className={`rounded-lg border px-3 py-2 bg-red-50 text-red-800 border-red-200 ${totalBy("PAYMENT_FAILED") === 0 ? "opacity-50" : ""}`}>
          <div className="text-[10px] font-medium uppercase tracking-wider">Errore pagamento</div>
          <div className="text-lg font-semibold mt-0.5 leading-tight">{totalBy("PAYMENT_FAILED")}</div>
          <div className="text-[10px] text-red-700 leading-tight">carta rifiutata</div>
        </div>
        <div className="rounded-lg border px-3 py-2 bg-warm-100 text-warm-900 border-warm-300">
          <div className="text-[10px] font-medium uppercase tracking-wider">Valore totale</div>
          <div className="text-lg font-semibold mt-0.5 leading-tight tabular-nums">{eurFmt(totalValueCents)}</div>
          <div className="text-[10px] text-warm-600 leading-tight">{orders.length} {orders.length === 1 ? "ordine" : "ordini"} non finalizzati</div>
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
          {PENDING_STATUSES.map((s) => (
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
          Nessun ordine non finalizzato con i filtri attuali.
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
                      {(() => {
                        const lbl = paymentMethodLabel(o);
                        if (!lbl) return <span className="text-warm-400 text-[11px]">—</span>;
                        const isBonifico = o.paymentProvider === "bonifico";
                        return <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${isBonifico ? "bg-amber-50 text-amber-800" : "bg-warm-100 text-warm-700"}`}>{lbl}</span>;
                      })()}
                      {o.storePickup && <span className="ml-1 inline-flex items-center text-[10px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-700">Ritiro</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${meta.cls}`}>
                        <Icon size={11} />
                        {statusLabel(o)}
                      </span>
                      {o.status === "PAYMENT_FAILED" && o.paymentErrorMessage && (() => {
                        const h = humanizeStripeError(o.paymentErrorMessage);
                        return (
                          <div className="text-[10px] text-red-700 mt-1 max-w-[260px] leading-tight" title={o.paymentErrorMessage}>
                            <span className="font-medium">{h.shortLabel}</span>
                            <div className="text-warm-500 leading-tight">{h.description}</div>
                          </div>
                        );
                      })()}
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
