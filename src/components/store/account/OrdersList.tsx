"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package, ChevronLeft } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";
import { formatNumber } from "@/lib/format";
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


function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { useGrouping: "always", style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrdersList() {
  const t = useStoreT();
  const { customer, loading } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/store/public/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.success ? d.data : []))
      .catch(() => setOrders([]));
  }, [customer]);

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">{t("Caricamento…", "Chargement…")}</div>;
  if (!customer) return <AuthForms />;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <Link href="/account" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> {t("Area riservata", "Espace personnel")}
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">{t("I miei ordini", "Mes commandes")}</h1>

      {orders === null ? (
        <div className="text-warm-500 text-sm">{t("Caricamento ordini…", "Chargement des commandes…")}</div>
      ) : orders.length === 0 ? (
        <div className="border border-warm-200 p-12 text-center">
          <Package size={32} className="mx-auto text-warm-400 mb-4" />
          <div className="text-warm-600 mb-4">{t("Non hai ancora effettuato ordini.", "Vous n'avez pas encore passé de commande.")}</div>
          <Link href="/" className="inline-block text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5 hover:text-warm-600">
            {t("Vai allo shop", "Aller à la boutique")}
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
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">{t("Ordine", "Commande")}</div>
                  <div className="text-sm font-mono text-warm-900">#{o.orderNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">{t("Data", "Date")}</div>
                  <div className="text-sm text-warm-900">{fmtDate(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">{t("Totale", "Total")}</div>
                  <div className="text-sm font-mono text-warm-900">{eur(o.totalCents)}</div>
                </div>
              </div>
              <div className="text-xs text-warm-500">
                {t(`${formatNumber(o.items.length)} articol${o.items.length === 1 ? "o" : "i"}`, `${formatNumber(o.items.length)} article${o.items.length === 1 ? "" : "s"}`)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
