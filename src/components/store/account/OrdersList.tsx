"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Package, ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";
import AuthForms from "./AuthForms";

async function retryOrderCheckout(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/store/public/orders/${orderId}/retry-prefill`, { cache: "no-store" });
    const j = await res.json();
    if (!j.success) return false;
    if (typeof window === "undefined") return false;
    localStorage.setItem("gtv_cart_v1", JSON.stringify(j.data.items));
    localStorage.setItem("gtv_checkout_prefill", JSON.stringify(j.data.prefill));
    return true;
  } catch {
    return false;
  }
}

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  paymentProvider: string | null;
  paymentMethodType: string | null;
  paymentErrorMessage: string | null;
  storePickup: boolean;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: { id: string; productName: string; variantName: string | null; quantity: number; totalCents: number }[];
}

function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

interface StatusUi { label: string; chip: string; isUrgent?: boolean; cta?: { label: string; href: string } }
function statusUi(o: OrderRow, t: (it: string, fr: string) => string): StatusUi {
  const isBonifico = o.paymentProvider === "bonifico";
  switch (o.status) {
    case "PENDING":
      return isBonifico
        ? { label: t("In attesa di accredito bonifico", "En attente du virement"), chip: "bg-amber-50 text-amber-800 border-amber-200" }
        : { label: t("Pagamento non effettuato", "Paiement non effectué"), chip: "bg-orange-50 text-orange-800 border-orange-200", isUrgent: true, cta: { label: t("Effettua il pagamento", "Effectuer le paiement"), href: "/checkout" } };
    case "ABANDONED_CHECKOUT":
      return { label: t("Checkout abbandonato", "Checkout abandonné"), chip: "bg-orange-50 text-orange-800 border-orange-200", isUrgent: true, cta: { label: t("Completa l'ordine", "Finaliser la commande"), href: "/checkout" } };
    case "PAYMENT_FAILED":
      return { label: t("Pagamento non riuscito", "Paiement échoué"), chip: "bg-red-50 text-red-800 border-red-200", isUrgent: true, cta: { label: t("Riprova il pagamento", "Réessayer le paiement"), href: "/checkout" } };
    case "CANCELLED":
      return { label: t("Ordine annullato", "Commande annulée"), chip: "bg-blue-50 text-blue-800 border-blue-200" };
    case "PAID":
      return { label: t("Pagamento confermato", "Paiement confirmé"), chip: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "PROCESSING":
      return { label: t("In preparazione", "En préparation"), chip: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "SHIPPED":
      return { label: t("Spedito", "Expédié"), chip: "bg-purple-50 text-purple-800 border-purple-200" };
    case "DELIVERED":
      return { label: t("Consegnato", "Livré"), chip: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "PICKED_UP":
      return { label: t("Ritirato in showroom", "Retiré au showroom"), chip: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "RETURNED":
      return { label: t("Reso", "Retourné"), chip: "bg-blue-50 text-blue-800 border-blue-200" };
    case "REFUNDED":
      return { label: t("Rimborsato", "Remboursé"), chip: "bg-blue-50 text-blue-800 border-blue-200" };
    case "PARTIALLY_REFUNDED":
      return { label: t("Rimborso parziale", "Remboursement partiel"), chip: "bg-blue-50 text-blue-800 border-blue-200" };
    default:
      return { label: o.status, chip: "bg-warm-100 text-warm-700 border-warm-200" };
  }
}

export default function OrdersList() {
  const t = useStoreT();
  const router = useRouter();
  const { customer, loading } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onRetry(orderId: string) {
    setRetryingId(orderId);
    const ok = await retryOrderCheckout(orderId);
    if (ok) {
      router.push("/checkout");
    } else {
      alert(t("Errore nel recupero dei dati dell'ordine.", "Erreur de récupération des données."));
      setRetryingId(null);
    }
  }

  async function onDelete(orderId: string) {
    if (!confirm(t("Vuoi rimuovere questo carrello? L'operazione non è reversibile.", "Voulez-vous supprimer ce panier ? L'opération est irréversible."))) return;
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/store/public/orders/${orderId}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) {
        setOrders((prev) => (prev ? prev.filter((o) => o.id !== orderId) : prev));
      } else {
        alert(j.error || t("Errore durante la rimozione.", "Erreur lors de la suppression."));
      }
    } catch {
      alert(t("Errore durante la rimozione.", "Erreur lors de la suppression."));
    } finally {
      setDeletingId(null);
    }
  }

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
          {orders.map((o) => {
            const ui = statusUi(o, t);
            return (
              <div key={o.id} className={`border p-5 transition-colors ${ui.isUrgent ? "border-orange-200 bg-orange-50/30" : "border-warm-200 hover:border-warm-900"}`}>
                <Link href={`/account/orders/${o.id}`} className="block">
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
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.15em] text-warm-500">{t("Stato", "Statut")}</div>
                      <span className={`inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded border ${ui.chip}`}>{ui.label}</span>
                    </div>
                  </div>
                  <div className="text-xs text-warm-500">
                    {t(`${o.items.length} articol${o.items.length === 1 ? "o" : "i"}`, `${o.items.length} article${o.items.length === 1 ? "" : "s"}`)}
                  </div>
                </Link>
                {ui.cta && (
                  <div className="mt-3 pt-3 border-t border-warm-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-warm-700">
                      {o.status === "PAYMENT_FAILED"
                        ? t("Il pagamento non è andato a buon fine.", "Le paiement n'a pas abouti.")
                        : t("Il pagamento non è stato completato.", "Le paiement n'a pas été complété.")}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={(e) => { e.preventDefault(); onDelete(o.id); }}
                        disabled={deletingId === o.id}
                        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-warm-500 border border-warm-300 px-3 py-2 hover:text-red-700 hover:border-red-300 disabled:opacity-50"
                      >
                        {deletingId === o.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        {t("Rimuovi", "Supprimer")}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); onRetry(o.id); }}
                        disabled={retryingId === o.id}
                        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] bg-warm-900 text-white px-4 py-2 hover:bg-black disabled:bg-warm-400"
                      >
                        {retryingId === o.id && <Loader2 size={12} className="animate-spin" />}
                        {ui.cta?.label || t("Effettua il pagamento", "Effectuer le paiement")} →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
