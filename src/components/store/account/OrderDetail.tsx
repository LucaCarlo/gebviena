"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Truck, Package, CheckCircle2, Clock, CircleAlert } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import AuthForms from "./AuthForms";

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  attributesSnapshot?: string | null;
}

interface OrderFull {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  currency: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paidAt: string | null;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  shippingAddress: string;
  billingAddress: string;
  shippingService: string | null;
  shippingZoneLabel: string | null;
  customerNotes: string | null;
  items: OrderItem[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "In attesa di pagamento",
  PAID: "Pagato",
  PROCESSING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
  REFUNDED: "Rimborsato",
  PARTIALLY_REFUNDED: "Parzialmente rimborsato",
};

const TIMELINE_STEPS = [
  { key: "PENDING", label: "Ordine ricevuto", icon: Clock },
  { key: "PAID", label: "Pagamento confermato", icon: CheckCircle2 },
  { key: "PROCESSING", label: "In preparazione", icon: Package },
  { key: "SHIPPED", label: "Spedito", icon: Truck },
  { key: "DELIVERED", label: "Consegnato", icon: CheckCircle2 },
];

function statusIndex(status: string) {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx < 0 ? 0 : idx;
}

function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function safeParseAddress(json: string): Record<string, string> {
  try { return JSON.parse(json); } catch { return {}; }
}

export default function OrderDetail({ orderId }: { orderId: string }) {
  const { customer, loading } = useCustomerAuth();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!customer) return;
    fetch(`/api/store/public/orders/${orderId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [customer, orderId]);

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">Caricamento…</div>;
  if (!customer) return <AuthForms />;
  if (notFound) return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="border border-warm-200 p-12 text-center">
        <CircleAlert size={28} className="mx-auto text-warm-400 mb-3" />
        <div className="text-warm-600 mb-4">Ordine non trovato.</div>
        <Link href="/account/orders" className="text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5">
          Torna agli ordini
        </Link>
      </div>
    </div>
  );
  if (!order) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">Caricamento ordine…</div>;

  const currentIdx = statusIndex(order.status);
  const shipping = safeParseAddress(order.shippingAddress);
  const billing = safeParseAddress(order.billingAddress);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> I miei ordini
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-warm-500 mb-1">Ordine</div>
          <h1 className="text-3xl font-light text-warm-900 font-mono">#{order.orderNumber}</h1>
          <div className="text-sm text-warm-500 mt-1">{fmtDate(order.createdAt)}</div>
        </div>
        <div className="text-sm text-warm-700 uppercase tracking-[0.15em] bg-warm-100 px-3 py-1.5">
          {STATUS_LABEL[order.status] || order.status}
        </div>
      </div>

      {/* Timeline tracking */}
      {!["CANCELLED", "REFUNDED"].includes(order.status) && (
        <div className="border border-warm-200 p-6 mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-5">Stato spedizione</div>
          <div className="grid grid-cols-5 gap-2 relative">
            {TIMELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentIdx;
              return (
                <div key={step.key} className="flex flex-col items-center text-center relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${done ? "bg-warm-900 text-white" : "bg-warm-100 text-warm-400"}`}>
                    <Icon size={16} />
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider ${done ? "text-warm-900" : "text-warm-400"}`}>
                    {step.label}
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className={`absolute top-[18px] left-1/2 w-full h-0.5 ${idx < currentIdx ? "bg-warm-900" : "bg-warm-200"}`} style={{ zIndex: -1 }} />
                  )}
                </div>
              );
            })}
          </div>

          {order.trackingNumber && (
            <div className="mt-6 pt-5 border-t border-warm-200 text-sm flex flex-wrap gap-4 items-center">
              <div>
                <span className="text-warm-500 mr-2">Corriere:</span>
                <span className="text-warm-900">{order.trackingCarrier || "—"}</span>
              </div>
              <div>
                <span className="text-warm-500 mr-2">Tracking:</span>
                <span className="font-mono text-warm-900">{order.trackingNumber}</span>
              </div>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5 hover:text-warm-600">
                  Traccia spedizione
                </a>
              )}
            </div>
          )}
          {order.shippedAt && <div className="mt-3 text-xs text-warm-500">Spedito il {fmtDate(order.shippedAt)}</div>}
          {order.deliveredAt && <div className="mt-1 text-xs text-warm-500">Consegnato il {fmtDate(order.deliveredAt)}</div>}
        </div>
      )}

      {/* Articoli */}
      <div className="border border-warm-200 mb-8">
        <div className="p-5 border-b border-warm-200 text-xs uppercase tracking-[0.2em] text-warm-500">Articoli</div>
        <div className="divide-y divide-warm-200">
          {order.items.map((it) => (
            <div key={it.id} className="p-5 flex justify-between gap-4">
              <div>
                <div className="text-sm text-warm-900">{it.productName}</div>
                {it.variantName && <div className="text-xs text-warm-500">{it.variantName}</div>}
                <div className="text-[11px] text-warm-400 font-mono mt-1">SKU {it.sku}</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-warm-500 text-xs">× {it.quantity}</div>
                <div className="font-mono text-warm-900 mt-1">{eur(it.totalCents)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-warm-200 space-y-1 text-sm">
          <Row label="Subtotale" value={eur(order.subtotalCents)} />
          <Row label="Spedizione" value={eur(order.shippingCents)} />
          <Row label="IVA" value={eur(order.taxCents)} />
          <div className="pt-2 mt-2 border-t border-warm-200">
            <Row label="Totale" value={eur(order.totalCents)} bold />
          </div>
        </div>
      </div>

      {/* Indirizzi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressCard title="Indirizzo di spedizione" addr={shipping} />
        <AddressCard title="Indirizzo di fatturazione" addr={billing} />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "text-warm-900 font-medium" : "text-warm-600"}>{label}</span>
      <span className={bold ? "text-warm-900 font-mono font-medium" : "text-warm-900 font-mono"}>{value}</span>
    </div>
  );
}

function AddressCard({ title, addr }: { title: string; addr: Record<string, string> }) {
  const has = Object.keys(addr).length > 0;
  return (
    <div className="border border-warm-200 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-3">{title}</div>
      {has ? (
        <div className="text-sm text-warm-800 leading-relaxed space-y-0.5">
          <div>{[addr.firstName, addr.lastName].filter(Boolean).join(" ")}</div>
          {addr.company && <div>{addr.company}</div>}
          <div>{addr.street1}</div>
          {addr.street2 && <div>{addr.street2}</div>}
          <div>{[addr.zip, addr.city].filter(Boolean).join(" ")}{addr.provinceCode ? ` (${addr.provinceCode})` : ""}</div>
          <div>{addr.countryCode}</div>
          {addr.phone && <div className="text-warm-500 text-xs mt-2">{addr.phone}</div>}
        </div>
      ) : (
        <div className="text-sm text-warm-500 italic">Non disponibile</div>
      )}
    </div>
  );
}
