"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, ChevronLeft } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import AuthForms from "./AuthForms";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: { id: string; productName: string; variantName: string | null; quantity: number; totalCents: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "In attesa",
  PAID: "Pagato",
  PROCESSING: "In preparazione",
  SHIPPED: "Spedito",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
  REFUNDED: "Rimborsato",
  PARTIALLY_REFUNDED: "Parzialmente rimborsato",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-neutral-200 text-neutral-700",
  PARTIALLY_REFUNDED: "bg-neutral-200 text-neutral-700",
};

function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrdersList() {
  const { customer, loading } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/store/public/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.success ? d.data : []))
      .catch(() => setOrders([]));
  }, [customer]);

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">Caricamento…</div>;
  if (!customer) return <AuthForms />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> Area riservata
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">I miei ordini</h1>

      {orders === null ? (
        <div className="text-warm-500 text-sm">Caricamento ordini…</div>
      ) : orders.length === 0 ? (
        <div className="border border-warm-200 p-12 text-center">
          <Package size={32} className="mx-auto text-warm-400 mb-4" />
          <div className="text-warm-600 mb-4">Non hai ancora effettuato ordini.</div>
          <Link href="/" className="inline-block text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5 hover:text-warm-600">
            Vai allo shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block border border-warm-200 hover:border-warm-900 p-5 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">Ordine</div>
                  <div className="text-sm font-mono text-warm-900">#{o.orderNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">Data</div>
                  <div className="text-sm text-warm-900">{fmtDate(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">Totale</div>
                  <div className="text-sm font-mono text-warm-900">{eur(o.totalCents)}</div>
                </div>
                <span className={`text-[11px] uppercase tracking-wider px-2 py-1 ${STATUS_COLOR[o.status] || "bg-warm-200 text-warm-700"}`}>
                  {STATUS_LABEL[o.status] || o.status}
                </span>
              </div>
              <div className="text-xs text-warm-500">
                {o.items.length} articol{o.items.length === 1 ? "o" : "i"}
                {o.trackingNumber && <span> · Tracking: {o.trackingNumber}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
