"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Clock, Mail, FileText, KeyRound } from "lucide-react";
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
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const resendAccessEmail = async () => {
    if (!order?.email || resending) return;
    setResending(true);
    try {
      await fetch("/api/store/public/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: order.email, purpose: "magic_link" }),
      });
      setResent(true);
    } catch { /* noop */ }
    setResending(false);
  };

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

      <p className="text-warm-600 leading-relaxed mb-8 max-w-md mx-auto">
        {isPending
          ? (isFr
              ? "Nous vérifions le paiement. Vous recevrez une confirmation par email sous peu."
              : "Stiamo verificando il pagamento. Riceverai una conferma via email a breve.")
          : (isFr
              ? `Nous avons bien reçu votre commande. Tout a été envoyé à ${order.email}.`
              : `Abbiamo ricevuto il tuo ordine. Tutto è stato inviato a ${order.email}.`)}
      </p>

      <div className="inline-block border border-warm-200 rounded p-6 mb-8 bg-warm-50/40">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-1">{isFr ? "Commande" : "Ordine"}</div>
        <div className="text-xl font-mono text-warm-900 mb-3">{order.orderNumber}</div>
        <div className="text-sm text-warm-700">{isFr ? "Total" : "Totale"}: <strong>{eur(order.totalCents, order.currency)}</strong></div>
      </div>

      {!isPending && (
        <div className="max-w-lg mx-auto mb-8 border border-warm-200 rounded-lg overflow-hidden text-left">
          <div className="px-5 py-3 bg-warm-50 border-b border-warm-200 text-[13px] font-medium text-warm-800 inline-flex items-center gap-2 w-full">
            <Mail size={15} /> {isFr ? "Vous allez recevoir 2 emails" : "Riceverai 2 email"}
          </div>
          <div className="divide-y divide-warm-100">
            <div className="px-5 py-3.5 flex items-start gap-3">
              <FileText size={16} className="text-warm-500 mt-0.5 shrink-0" />
              <div className="text-[13px] text-warm-700">
                <strong className="text-warm-900">{isFr ? "1. Confirmation + facture PDF" : "1. Conferma ordine + fattura PDF"}</strong>
                <div className="text-warm-600 mt-0.5">
                  {isFr
                    ? "Le récapitulatif de votre commande avec la facture en pièce jointe."
                    : "Il riepilogo del tuo ordine con la fattura allegata in PDF."}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 flex items-start gap-3">
              <KeyRound size={16} className="text-warm-500 mt-0.5 shrink-0" />
              <div className="text-[13px] text-warm-700 w-full">
                <strong className="text-warm-900">{isFr ? "2. Accès à votre espace privé" : "2. Accesso all'area riservata"}</strong>
                <div className="text-warm-600 mt-0.5">
                  {isFr
                    ? "Un lien pour entrer dans votre espace. Au premier accès vous choisirez un mot de passe pour les prochaines connexions."
                    : "Un link per entrare nella tua area. Al primo accesso sceglierai una password per le volte successive."}
                </div>
                <div className="mt-2.5">
                  {resent ? (
                    <span className="text-[12px] text-emerald-700 inline-flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      {isFr
                        ? `Email d'accès renvoyée à ${order.email} (vérifiez les spams).`
                        : `Email di accesso reinviata a ${order.email} (controlla anche lo spam).`}
                    </span>
                  ) : (
                    <button
                      onClick={resendAccessEmail}
                      disabled={resending}
                      className="text-[12px] text-warm-900 font-medium underline hover:text-black disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {resending && <Loader2 size={12} className="animate-spin" />}
                      {isFr ? "Vous ne l'avez pas reçu ? Renvoyer le lien d'accès" : "Non l'hai ricevuta? Rinvia il link di accesso"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
