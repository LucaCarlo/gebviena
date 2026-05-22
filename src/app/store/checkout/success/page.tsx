"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/I18nContext";
import { fbTrack } from "@/lib/fbpixel";

interface OrderSummary {
  orderNumber: string;
  status: string;
  email: string;
  totalCents: number;
  currency: string;
  paymentProvider?: string | null;
  language?: string;
}

const BANK_DETAILS = {
  beneficiary: "Production Furniture International S.p.A",
  beneficiaryAddress: "Via Vincenzo Vela 35/B, Torino — P.IVA 08743760012",
  bank: "Intesa SanPaolo S.p.A.",
  bankBranch: "Tolentino (MC) Italia — Piazzale Peramezza/2",
  iban: "IT60R0306969200100000002565",
  bic: "BCITITMMXXX",
};

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
          // Per ordini bonifico lo stato resta PENDING per design (admin manuale): non fare polling.
          if (data.data.status === "PENDING" && data.data.paymentProvider !== "bonifico" && pollCount < 8) {
            setTimeout(() => setPollCount((n) => n + 1), 2500);
          }
          // Meta Pixel: Purchase event. Una sola volta per orderId (chiave in sessionStorage).
          const firedKey = `fb_purchase_${data.data.orderNumber}`;
          if (typeof window !== "undefined" && !sessionStorage.getItem(firedKey)) {
            sessionStorage.setItem(firedKey, "1");
            fbTrack("Purchase", {
              value: (data.data.totalCents || 0) / 100,
              currency: data.data.currency || "EUR",
              content_type: "product",
              order_number: data.data.orderNumber,
            });
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

  const isBonifico = order.paymentProvider === "bonifico";
  const isPending = order.status === "PENDING" && !isBonifico;

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
          : isBonifico
            ? (isFr
                ? `Votre commande a bien été enregistrée. Nous vous avons envoyé une e-mail à ${order.email} avec les coordonnées bancaires et le récapitulatif (PDF en pièce jointe).`
                : `Il tuo ordine è stato ricevuto. Ti abbiamo inviato un'email a ${order.email} con le coordinate bancarie e il riepilogo (PDF allegato).`)
            : (isFr
                ? `Nous avons bien reçu votre commande. Une confirmation avec le récapitulatif (PDF en pièce jointe) a été envoyée à ${order.email}.`
                : `Abbiamo ricevuto il tuo ordine. Una conferma con il riepilogo (PDF allegato) è stata inviata a ${order.email}.`)}
      </p>

      <div className="inline-block border border-warm-200 rounded p-6 mb-8 bg-warm-50/40">
        <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-1">{isFr ? "Commande" : "Ordine"}</div>
        <div className="text-xl font-mono text-warm-900 mb-3">{order.orderNumber}</div>
        <div className="text-sm text-warm-700">{isFr ? "Total" : "Totale"}: <strong>{eur(order.totalCents, order.currency)}</strong></div>
      </div>

      {isBonifico && (
        <div className="text-left max-w-lg mx-auto mb-8 border border-warm-300 rounded-lg p-5 bg-white shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-warm-600 mb-3 text-center">
            {isFr ? "Coordonnées bancaires" : "Coordinate bancarie per il bonifico"}
          </div>
          <dl className="text-[13px] text-warm-800 space-y-2 leading-[1.55]">
            <div>
              <dt className="text-warm-500">{isFr ? "Bénéficiaire" : "Beneficiario"}</dt>
              <dd className="font-medium">{BANK_DETAILS.beneficiary}</dd>
              <dd className="text-warm-600 text-[12px]">{BANK_DETAILS.beneficiaryAddress}</dd>
            </div>
            <div>
              <dt className="text-warm-500">{isFr ? "Banque" : "Banca"}</dt>
              <dd className="font-medium">{BANK_DETAILS.bank}</dd>
              <dd className="text-warm-600 text-[12px]">{BANK_DETAILS.bankBranch}</dd>
            </div>
            <div>
              <dt className="text-warm-500">IBAN</dt>
              <dd className="font-mono font-semibold text-warm-900 break-all">{BANK_DETAILS.iban}</dd>
            </div>
            <div>
              <dt className="text-warm-500">BIC / SWIFT</dt>
              <dd className="font-mono">{BANK_DETAILS.bic}</dd>
            </div>
            <div>
              <dt className="text-warm-500">{isFr ? "Motif (à indiquer obligatoirement)" : "Causale (obbligatoria)"}</dt>
              <dd className="font-mono font-semibold text-warm-900">{`Ordine ${order.orderNumber}`}</dd>
            </div>
          </dl>
          <p className="mt-4 pt-3 border-t border-warm-200 text-[12px] text-warm-700 leading-[1.6]">
            {isFr
              ? "Pour tout paiement par virement bancaire, le traitement de la commande interviendra après confirmation de la bonne réception des fonds."
              : "In caso di pagamento tramite bonifico bancario, ci riserviamo di attendere la conferma dell'avvenuto accredito prima di procedere con l'elaborazione dell'ordine."}
          </p>
        </div>
      )}

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
