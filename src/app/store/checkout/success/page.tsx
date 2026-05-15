"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/I18nContext";

interface OrderSummary {
  orderNumber: string;
  status: string;
  email: string;
  totalCents: number;
  currency: string;
}

const eur = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Loader2 className="animate-spin mx-auto mb-4 text-warm-700" size={32} />
        <p className="text-warm-700">Verifica pagamento...</p>
      </div>
    }>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { clear } = useCart();
  const lang = useLang();
  const isFr = lang === "fr";
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    clear();
  }, [clear]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchOrder = async () => {
      try {
        // Endpoint pubblico: fa anche fallback Stripe lookup se l'ordine è ancora PENDING.
        const res = await fetch(`/api/store/public/checkout/order-status/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.success) {
          setOrder(data.data);
          if (data.data.status === "PENDING" && pollCount < 8) {
            setTimeout(() => setPollCount((n) => n + 1), 2500);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrder();
    return () => { cancelled = true; };
  }, [orderId, pollCount]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Loader2 className="animate-spin mx-auto mb-4 text-warm-700" size={32} />
        <p className="text-warm-700">Verifica pagamento...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-light text-warm-900 mb-3">Ordine non trovato</h1>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800">
          Torna allo shop
        </Link>
      </div>
    );
  }

  const isPending = order.status === "PENDING";

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isPending ? "bg-amber-50" : "bg-emerald-50"}`}>
        {isPending ? (
          <Clock size={36} className="text-amber-600" />
        ) : (
          <CheckCircle2 size={40} className="text-emerald-600" />
        )}
      </div>

      <h1 className="text-3xl font-light text-warm-900 mb-3">
        {isPending
          ? (isFr ? "Paiement en cours de traitement" : "Pagamento in elaborazione")
          : (isFr ? "Merci pour votre commande !" : "Grazie per il tuo ordine!")}
      </h1>

      <p className="text-warm-600 leading-relaxed mb-8 max-w-lg mx-auto">
        {isPending
          ? (isFr
              ? "Nous vérifions le paiement. Vous recevrez une confirmation par email sous peu."
              : "Stiamo verificando il pagamento. Riceverai una conferma via email a breve.")
          : (isFr
              ? `Nous avons bien reçu votre commande. Une confirmation avec le récapitulatif (PDF en pièce jointe) a été envoyée à ${order.email}.`
              : `Abbiamo ricevuto il tuo ordine. Una conferma con il riepilogo (PDF allegato) è stata inviata a ${order.email}.`)}
      </p>

      <div className="inline-block border border-warm-200 rounded p-6 mb-8 bg-warm-50/40">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-1">{isFr ? "Commande" : "Ordine"}</div>
        <div className="text-xl font-mono text-warm-900 mb-3">{order.orderNumber}</div>
        <div className="text-sm text-warm-700">{isFr ? "Total" : "Totale"}: <strong>{eur(order.totalCents, order.currency)}</strong></div>
      </div>

      {!isPending && (
        <p className="max-w-lg mx-auto mb-8 text-[13px] text-warm-600 leading-relaxed">
          {isFr
            ? "Vous pouvez accéder à votre espace personnel à tout moment avec votre adresse e-mail (sans mot de passe) : nous vous enverrons un lien de connexion."
            : "Puoi accedere alla tua area riservata in qualsiasi momento con la tua email (senza password): ti invieremo un link per entrare."}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/account" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800">
          {isFr ? "Mon espace" : "Area riservata"}
        </Link>
        <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-warm-300 text-warm-900 uppercase text-sm tracking-wider hover:bg-warm-50">
          {isFr ? "Continuer mes achats" : "Continua a esplorare"}
        </Link>
      </div>
    </div>
  );
}
