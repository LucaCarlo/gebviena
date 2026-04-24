"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2, ArrowLeft, Check, X, AlertCircle, RotateCcw, Truck, Copy,
} from "lucide-react";

type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  volumeM3: string | number;
  weightKg: string | number | null;
  totalCents: number;
  attributesSnapshot: string | null;
  variant: {
    id: string;
    sku: string;
    coverImage: string | null;
    storeProduct: { id: string; product: { name: string; slug: string } };
  } | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  language: string;
  shippingAddress: string;
  billingAddress: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  taxRateBp: number;
  shippingService: string | null;
  shippingZoneLabel: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paymentProvider: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmountCents: number | null;
  refundReason: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null;
  } | null;
  items: OrderItem[];
}

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "In attesa di pagamento",
  PAID: "Pagato",
  PROCESSING: "In lavorazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
  REFUNDED: "Rimborsato",
  PARTIALLY_REFUNDED: "Rimborso parziale",
};

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function parseAddress(json: string): Record<string, string> {
  try { return JSON.parse(json); } catch { return {}; }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState({ number: "", carrier: "", url: "" });
  const [adminNotes, setAdminNotes] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/store/orders/${params.id}`).then((r) => r.json());
    if (res.success) {
      setOrder(res.data);
      setTracking({
        number: res.data.trackingNumber || "",
        carrier: res.data.trackingCarrier || "",
        url: res.data.trackingUrl || "",
      });
      setAdminNotes(res.data.adminNotes || "");
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const updateOrder = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/store/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        showToast("Aggiornato", true);
      } else {
        showToast(data.error || "Errore", false);
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus: OrderStatus) => {
    if (!confirm(`Cambiare stato a "${STATUS_LABEL[newStatus]}"?`)) return;
    await updateOrder({ status: newStatus });
  };

  const saveTracking = async () => {
    await updateOrder({
      trackingNumber: tracking.number,
      trackingCarrier: tracking.carrier,
      trackingUrl: tracking.url,
    });
  };

  const saveAdminNotes = async () => {
    await updateOrder({ adminNotes });
  };

  const doRefund = async () => {
    const cents = refundAmount ? Math.round(Number(refundAmount) * 100) : undefined;
    const res = await fetch(`/api/store/orders/${params.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: cents, reason: refundReason }),
    });
    const data = await res.json();
    if (data.success) {
      setOrder(data.data);
      setRefundOpen(false);
      showToast(data.note || "Refund registrato", true);
    } else {
      showToast(data.error || "Errore", false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-24 text-warm-500">
        Ordine non trovato. <Link href="/admin/store/orders" className="underline text-warm-900">Torna alla lista</Link>
      </div>
    );
  }

  const shipAddr = parseAddress(order.shippingAddress);
  const billAddr = parseAddress(order.billingAddress);

  return (
    <div className="max-w-6xl">
      <div className="mb-4">
        <Link href="/admin/store/orders" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna alla lista
        </Link>
      </div>

      <header className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 font-mono">{order.orderNumber}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-warm-500">
              {new Date(order.createdAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="text-warm-300">·</span>
            <span className="text-warm-700">{order.firstName} {order.lastName}</span>
            <span className="text-warm-300">·</span>
            <span className="text-warm-700 font-mono text-xs">{order.email}</span>
            {!order.customer && <span className="text-xs text-warm-400 italic">(guest)</span>}
          </div>
        </div>
      </header>

      {/* Status bar */}
      <section className="bg-white rounded-lg border border-warm-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-warm-500 uppercase tracking-wider mb-1">Stato attuale</div>
            <div className="text-lg font-semibold text-warm-900">{STATUS_LABEL[order.status]}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.filter((s) => s !== order.status).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={saving}
                className="px-3 py-1.5 text-xs border border-warm-200 bg-white hover:bg-warm-50 rounded disabled:opacity-50"
              >
                → {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: items + totals */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-200 font-medium text-warm-900">Articoli</div>
            <table className="w-full text-sm">
              <thead className="bg-warm-50 text-warm-500 text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Prodotto</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Prezzo</th>
                  <th className="px-4 py-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {order.items.map((it) => {
                  const attrs = it.attributesSnapshot ? (() => { try { return JSON.parse(it.attributesSnapshot!) as Record<string, string>; } catch { return {}; } })() : {};
                  return (
                    <tr key={it.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-warm-900">{it.productName}</div>
                        {it.variantName && <div className="text-xs text-warm-500">{it.variantName}</div>}
                        {Object.keys(attrs).length > 0 && (
                          <div className="text-xs text-warm-500 mt-0.5">
                            {Object.entries(attrs).map(([k, v]) => <span key={k} className="mr-2">{k}: <strong>{v}</strong></span>)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-warm-500">{it.sku}</td>
                      <td className="px-4 py-3 text-center text-warm-700">{it.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono text-warm-600">{euro(it.unitPriceCents, order.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono text-warm-900">{euro(it.totalCents, order.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-warm-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">Subtotale</td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(order.subtotalCents, order.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">
                    Spedizione
                    {order.shippingZoneLabel && <span className="text-xs text-warm-400 ml-2">({order.shippingZoneLabel})</span>}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(order.shippingCents, order.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">IVA ({(order.taxRateBp / 100).toFixed(1)}%)</td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(order.taxCents, order.currency)}</td>
                </tr>
                <tr className="border-t border-warm-200">
                  <td colSpan={4} className="px-4 py-2 text-right font-semibold text-warm-900">Totale</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-warm-900">{euro(order.totalCents, order.currency)}</td>
                </tr>
                {order.refundAmountCents !== null && order.refundAmountCents > 0 && (
                  <tr className="bg-red-50">
                    <td colSpan={4} className="px-4 py-1.5 text-right text-red-700 text-xs">Rimborsato</td>
                    <td className="px-4 py-1.5 text-right font-mono text-red-700">−{euro(order.refundAmountCents, order.currency)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </section>

          {/* Tracking */}
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-3 inline-flex items-center gap-2">
              <Truck size={16} /> Spedizione
            </h2>
            {order.shippingService && (
              <div className="text-sm text-warm-600 mb-3">
                Servizio scelto: <strong>{order.shippingService}</strong>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Numero tracking</label>
                <input
                  value={tracking.number}
                  onChange={(e) => setTracking((t) => ({ ...t, number: e.target.value }))}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Corriere</label>
                <input
                  value={tracking.carrier}
                  onChange={(e) => setTracking((t) => ({ ...t, carrier: e.target.value }))}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">URL tracking</label>
                <input
                  value={tracking.url}
                  onChange={(e) => setTracking((t) => ({ ...t, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={saveTracking} disabled={saving} className="px-3 py-1.5 bg-warm-900 text-white rounded text-sm hover:bg-warm-800 disabled:opacity-50">
                Salva tracking
              </button>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-3">Note</h2>
            {order.customerNotes && (
              <div className="mb-3 text-sm bg-amber-50 border border-amber-200 rounded p-3">
                <div className="text-xs text-amber-700 font-medium mb-1">Note del cliente</div>
                {order.customerNotes}
              </div>
            )}
            <label className="block text-xs font-medium text-warm-600 mb-1">Note interne (non visibili al cliente)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
            />
            <div className="mt-2 flex justify-end">
              <button onClick={saveAdminNotes} disabled={saving} className="px-3 py-1.5 bg-warm-100 text-warm-800 rounded text-sm hover:bg-warm-200 disabled:opacity-50">
                Salva note
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT: addresses, payment, actions */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-900 mb-2 text-sm">Indirizzo spedizione</h3>
            <AddressView addr={shipAddr} />
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-4">
            <h3 className="font-medium text-warm-900 mb-2 text-sm">Indirizzo fatturazione</h3>
            <AddressView addr={billAddr} />
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-2">Pagamento</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-warm-500">Provider</dt><dd className="text-warm-800">{order.paymentProvider || "—"}</dd></div>
              {order.paidAt && <div className="flex justify-between"><dt className="text-warm-500">Pagato il</dt><dd className="text-warm-800">{new Date(order.paidAt).toLocaleString("it-IT")}</dd></div>}
              {order.stripePaymentIntentId && (
                <div className="flex justify-between items-center">
                  <dt className="text-warm-500">Stripe PI</dt>
                  <dd className="font-mono text-[10px] text-warm-600 truncate max-w-[140px]" title={order.stripePaymentIntentId}>
                    <CopyBtn text={order.stripePaymentIntentId} />
                  </dd>
                </div>
              )}
            </dl>

            {(order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED" || order.status === "PARTIALLY_REFUNDED") && (
              <button
                onClick={() => setRefundOpen(true)}
                className="mt-3 w-full px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-sm hover:bg-red-100 inline-flex items-center justify-center gap-2"
              >
                <RotateCcw size={13} /> Emetti refund
              </button>
            )}
          </section>
        </div>
      </div>

      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-warm-200 flex items-center justify-between">
              <h2 className="font-semibold text-warm-900">Emetti refund</h2>
              <button onClick={() => setRefundOpen(false)} className="text-warm-400 hover:text-warm-900"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Il refund viene registrato localmente. L&apos;integrazione Stripe per il refund automatico verrà attivata in fase successiva.
              </p>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Importo (€, vuoto = totale)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={order.totalCents / 100}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`${(order.totalCents / 100).toFixed(2)}`}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">Motivo</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-warm-200 flex justify-end gap-2">
              <button onClick={() => setRefundOpen(false)} className="px-4 py-2 text-sm text-warm-600">Annulla</button>
              <button onClick={doRefund} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Conferma refund</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
            toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function AddressView({ addr }: { addr: Record<string, string> }) {
  if (!addr || Object.keys(addr).length === 0) {
    return <div className="text-xs text-warm-400 italic">Non disponibile</div>;
  }
  return (
    <div className="text-sm text-warm-700 space-y-0.5">
      <div>{addr.firstName} {addr.lastName}</div>
      {addr.company && <div className="text-warm-500 text-xs">{addr.company}</div>}
      <div>{addr.street1}{addr.street2 ? `, ${addr.street2}` : ""}</div>
      <div>{addr.zip} {addr.city} {addr.provinceCode ? `(${addr.provinceCode})` : ""}</div>
      <div className="text-warm-500 text-xs">{addr.countryCode}</div>
      {addr.phone && <div className="text-warm-500 text-xs">☎ {addr.phone}</div>}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 hover:text-warm-900"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />} {text.slice(0, 14)}…
    </button>
  );
}
