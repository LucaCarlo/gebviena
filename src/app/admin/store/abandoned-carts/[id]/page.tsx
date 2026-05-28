"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, Check, AlertCircle, Clock } from "lucide-react";
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

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  attributesSnapshot: string | null;
}

interface CartDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  taxRateBp: number;
  shippingZoneLabel: string | null;
  paymentProvider: string | null;
  paymentMethodType: string | null;
  paymentErrorMessage: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  customer: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null } | null;
  items: OrderItem[];
}

// Stati che hanno senso assegnare a un carrello abbandonato dall'admin.
const STATUSES: OrderStatus[] = [
  "ABANDONED_CHECKOUT", "PAYMENT_FAILED", "PENDING", "PAID", "CANCELLED",
];
const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "In attesa di accredito bonifico",
  ABANDONED_CHECKOUT: "Checkout abbandonato",
  PAYMENT_FAILED: "Errore pagamento",
  CANCELLED: "Annullato",
  PAID: "Pagato (recuperato)",
  PROCESSING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  PICKED_UP: "Ritirato in showroom",
  RETURNED: "Reso",
  REFUNDED: "Rimborsato",
  PARTIALLY_REFUNDED: "Rimborso parziale",
};

const euro = (cents: number, currency: string) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

function statusHeadline(c: { status: OrderStatus; paymentProvider: string | null }): string {
  if (c.status === "PENDING" && c.paymentProvider !== "bonifico") return "Pagamento non effettuato";
  return STATUS_LABEL[c.status];
}

export default function AbandonedCartDetailPage() {
  const params = useParams<{ id: string }>();
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/store/orders/${params.id}`).then((r) => r.json());
    if (res.success) {
      setCart(res.data);
      setAdminNotes(res.data.adminNotes || "");
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateCart = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/store/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
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
    await updateCart({ status: newStatus });
  };

  const saveAdminNotes = async () => updateCart({ adminNotes });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-warm-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="text-center py-24 text-warm-500">
        Carrello non trovato.{" "}
        <Link href="/admin/store/abandoned-carts" className="underline text-warm-900">Torna ai carrelli abbandonati</Link>
      </div>
    );
  }

  // Se il carrello è stato recuperato (stato da "ordine vero"), suggerisci la pagina ordini.
  const isStillCart = cart.status === "ABANDONED_CHECKOUT"
    || cart.status === "PAYMENT_FAILED"
    || cart.status === "PENDING"
    || cart.status === "CANCELLED";

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Link href="/admin/store/abandoned-carts" className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-900">
          <ArrowLeft size={14} /> Torna a Carrelli abbandonati
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-warm-900 font-mono break-all">{cart.orderNumber}</h1>
        <div className="mt-1 text-sm flex flex-col md:flex-row md:flex-wrap md:items-center md:gap-3">
          <span className="text-warm-500">
            {new Date(cart.createdAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="hidden md:inline text-warm-300">·</span>
          <span className="text-warm-700">{cart.firstName} {cart.lastName}</span>
          <span className="hidden md:inline text-warm-300">·</span>
          <span className="text-warm-700 font-mono text-xs break-all">{cart.email}</span>
          {!cart.customer && <span className="text-xs text-warm-400 italic">(guest)</span>}
        </div>
      </header>

      {/* Status bar */}
      <section className="bg-white rounded-lg border border-warm-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-warm-500 uppercase tracking-wider mb-1">Stato attuale</div>
            <div className="text-lg font-semibold text-warm-900">{statusHeadline(cart)}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-warm-500 uppercase tracking-wider">Cambia stato</label>
            <select
              value={STATUSES.includes(cart.status) ? cart.status : ""}
              disabled={saving}
              onChange={(e) => {
                const newStatus = e.target.value as OrderStatus;
                if (newStatus && newStatus !== cart.status) changeStatus(newStatus);
              }}
              className="px-3 py-1.5 text-sm border border-warm-200 bg-white rounded focus:border-warm-700 outline-none disabled:opacity-50"
            >
              {!STATUSES.includes(cart.status) && (
                <option value="">{STATUS_LABEL[cart.status]}</option>
              )}
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>
        {!isStillCart && (
          <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
            Questo carrello è stato recuperato: ora è un ordine. Gestiscilo dalla pagina{" "}
            <Link href={`/admin/store/orders/${cart.id}`} className="underline font-medium">Ordini</Link>.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: items + totals */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-200 font-medium text-warm-900">Articoli nel carrello</div>

            {/* Mobile: card per articolo */}
            <div className="md:hidden divide-y divide-warm-100">
              {cart.items.map((it) => {
                const attrs = it.attributesSnapshot ? (() => { try { return JSON.parse(it.attributesSnapshot!) as Record<string, string>; } catch { return {}; } })() : {};
                return (
                  <div key={it.id} className="p-3">
                    <div className="font-medium text-warm-900 break-words">{it.productName}</div>
                    {it.variantName && <div className="text-xs text-warm-500">{it.variantName}</div>}
                    {Object.keys(attrs).length > 0 && (
                      <div className="text-xs text-warm-500 mt-0.5 flex flex-wrap gap-x-2">
                        {Object.entries(attrs).map(([k, v]) => <span key={k}>{k}: <strong>{v}</strong></span>)}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono text-warm-500">SKU {it.sku}</span>
                      <span className="text-warm-600">
                        <span className="font-mono">{it.quantity}</span> × <span className="font-mono">{euro(it.unitPriceCents, cart.currency)}</span>
                      </span>
                      <span className="font-mono font-semibold text-warm-900">{euro(it.totalCents, cart.currency)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="bg-warm-50 px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between text-warm-600"><span>Subtotale</span><span className="font-mono">{euro(cart.subtotalCents, cart.currency)}</span></div>
                <div className="flex justify-between text-warm-600">
                  <span>Spedizione {cart.shippingZoneLabel && <span className="text-xs text-warm-400">({cart.shippingZoneLabel})</span>}</span>
                  <span className="font-mono">{euro(cart.shippingCents, cart.currency)}</span>
                </div>
                <div className="flex justify-between text-warm-600"><span>IVA ({(cart.taxRateBp / 100).toFixed(1)}%)</span><span className="font-mono">{euro(cart.taxCents, cart.currency)}</span></div>
                <div className="flex justify-between pt-2 mt-1 border-t border-warm-200 font-semibold text-warm-900"><span>Totale</span><span className="font-mono">{euro(cart.totalCents, cart.currency)}</span></div>
              </div>
            </div>

            {/* Desktop: tabella */}
            <table className="hidden md:table w-full text-sm">
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
                {cart.items.map((it) => {
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
                      <td className="px-4 py-3 text-right font-mono text-warm-600">{euro(it.unitPriceCents, cart.currency)}</td>
                      <td className="px-4 py-3 text-right font-mono text-warm-900">{euro(it.totalCents, cart.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-warm-50 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">Subtotale</td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(cart.subtotalCents, cart.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">
                    Spedizione{cart.shippingZoneLabel && <span className="text-xs text-warm-400 ml-2">({cart.shippingZoneLabel})</span>}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(cart.shippingCents, cart.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1.5 text-right text-warm-500">IVA ({(cart.taxRateBp / 100).toFixed(1)}%)</td>
                  <td className="px-4 py-1.5 text-right font-mono text-warm-700">{euro(cart.taxCents, cart.currency)}</td>
                </tr>
                <tr className="border-t border-warm-200">
                  <td colSpan={4} className="px-4 py-2 text-right font-semibold text-warm-900">Totale</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-warm-900">{euro(cart.totalCents, cart.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Note interne */}
          <section className="bg-white rounded-lg border border-warm-200 p-6">
            <h2 className="font-medium text-warm-900 mb-3">Note</h2>
            {cart.customerNotes && (
              <div className="mb-3 text-sm bg-amber-50 border border-amber-200 rounded p-3">
                <div className="text-xs text-amber-700 font-medium mb-1">Note del cliente</div>
                {cart.customerNotes}
              </div>
            )}
            <label className="block text-xs font-medium text-warm-600 mb-1">Note interne (per il recupero, non visibili al cliente)</label>
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

        {/* RIGHT: contatto + pagamento */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-2">Contatto cliente</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-warm-500">Nome</dt><dd className="text-warm-800 text-right">{cart.firstName} {cart.lastName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-warm-500">Email</dt><dd className="text-warm-800 font-mono text-right break-all">{cart.email}</dd></div>
              {cart.phone && <div className="flex justify-between gap-2"><dt className="text-warm-500">Telefono</dt><dd className="text-warm-800 text-right">{cart.phone}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-warm-500">Tipo</dt><dd className="text-warm-800 text-right">{cart.customer ? "Registrato" : "Guest"}</dd></div>
            </dl>
            <a
              href={`mailto:${cart.email}`}
              className="mt-3 w-full px-3 py-1.5 bg-warm-900 text-white rounded text-sm hover:bg-warm-800 inline-flex items-center justify-center gap-2"
            >
              Scrivi al cliente
            </a>
          </section>

          <section className="bg-white rounded-lg border border-warm-200 p-4 text-sm">
            <h3 className="font-medium text-warm-900 mb-2">Pagamento</h3>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-warm-500">Provider</dt><dd className="text-warm-800">{cart.paymentProvider || "—"}</dd></div>
              {cart.paymentMethodType && (
                <div className="flex justify-between"><dt className="text-warm-500">Metodo</dt><dd className="text-warm-800">{cart.paymentMethodType}</dd></div>
              )}
            </dl>
            {cart.paymentErrorMessage && (() => {
              const h = humanizeStripeError(cart.paymentErrorMessage);
              return (
                <div className="mt-3 px-3 py-2 rounded bg-red-50 border border-red-200 text-[12px] text-red-800">
                  <div className="font-medium mb-1 inline-flex items-center gap-1"><Clock size={12} /> {h.shortLabel}</div>
                  <div className="text-red-700 mb-1.5">{h.description}</div>
                  <div className="text-warm-700 italic">Cosa suggerire al cliente: {h.customerSuggestion}</div>
                  <details className="mt-1.5">
                    <summary className="text-warm-500 cursor-pointer text-[10px] uppercase tracking-wider">Messaggio originale Stripe</summary>
                    <div className="text-warm-600 text-[11px] mt-1 font-mono break-all">{cart.paymentErrorMessage}</div>
                  </details>
                </div>
              );
            })()}
          </section>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 ${toast.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.ok ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
