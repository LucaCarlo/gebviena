"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";

interface OrderSlim {
  id: string;
  orderNumber: string;
  status: string;
  paymentProvider: string | null;
  totalCents: number;
  currency: string;
}

const DISMISS_KEY = "gtv_pending_dismiss";

/**
 * Banner globale per il cliente loggato: appare top-right sotto l'header
 * se ha ordini in stato "da completare" (PENDING stripe, ABANDONED_CHECKOUT,
 * PAYMENT_FAILED). Click → /account/orders. La X lo nasconde per la sessione
 * corrente (sessionStorage).
 */
export default function PendingOrdersBanner() {
  const t = useStoreT();
  const { customer } = useCustomerAuth();
  const [pending, setPending] = useState<OrderSlim[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!customer) { setPending([]); return; }
    fetch("/api/store/public/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !Array.isArray(d.data)) return;
        const list: OrderSlim[] = d.data.filter((o: OrderSlim) =>
          o.status === "ABANDONED_CHECKOUT"
          || o.status === "PAYMENT_FAILED"
          || (o.status === "PENDING" && o.paymentProvider !== "bonifico")
        );
        setPending(list);
      })
      .catch(() => { /* silent */ });
  }, [customer]);

  if (!customer || pending.length === 0 || dismissed) return null;

  const hasFailed = pending.some((o) => o.status === "PAYMENT_FAILED");
  const message = hasFailed
    ? t("Hai un pagamento non riuscito.", "Vous avez un paiement échoué.")
    : pending.length === 1
      ? t("Hai un ordine in sospeso da completare.", "Vous avez une commande en attente à finaliser.")
      : t(`Hai ${pending.length} ordini in sospeso da completare.`, `Vous avez ${pending.length} commandes en attente à finaliser.`);
  const cta = hasFailed
    ? t("Riprova il pagamento", "Réessayer le paiement")
    : t("Completa l'ordine", "Finaliser la commande");

  return (
    <div className="fixed top-20 md:top-24 right-4 z-40 max-w-sm">
      <div className={`shadow-lg border ${hasFailed ? "border-red-300 bg-red-50" : "border-orange-300 bg-orange-50"} rounded-lg p-4`}>
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className={hasFailed ? "text-red-700 mt-0.5" : "text-orange-700 mt-0.5"} />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${hasFailed ? "text-red-900" : "text-orange-900"}`}>{message}</div>
            <Link
              href="/account/orders"
              className={`inline-block mt-2 text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 ${hasFailed ? "bg-red-700 hover:bg-red-800" : "bg-warm-900 hover:bg-black"} text-white`}
            >
              {cta} →
            </Link>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* */ }
            }}
            className={`p-1 rounded hover:bg-white/50 ${hasFailed ? "text-red-700" : "text-orange-700"}`}
            aria-label="Chiudi"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
