"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

interface IntentResponse {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  currency: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, count } = useCart();

  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [phase, setPhase] = useState<"address" | "payment">("address");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "IT",
    customerNotes: "",
  });

  // Load Stripe publishable key once
  useEffect(() => {
    fetch("/api/store/public/checkout/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.publishableKey) {
          setStripePromise(loadStripe(d.data.publishableKey));
        } else {
          setError("Stripe non configurato. Configura le chiavi su /admin/store/settings.");
        }
      })
      .catch(() => setError("Errore caricamento configurazione Stripe."));
  }, []);

  const updateField = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazione minima
    const required = ["email", "firstName", "lastName", "street", "city", "postalCode", "country"];
    for (const k of required) {
      if (!form[k as keyof typeof form]?.toString().trim()) {
        setError("Compila tutti i campi obbligatori.");
        return;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Email non valida.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/store/public/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          customer: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
          },
          shippingAddress: {
            street: form.street,
            city: form.city,
            province: form.province,
            postalCode: form.postalCode,
            country: form.country,
          },
          customerNotes: form.customerNotes,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Errore creazione ordine.");
        setSubmitting(false);
        return;
      }
      setIntent(data.data);
      setPhase("payment");
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-light text-warm-900 mb-3">Il carrello è vuoto</h1>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800">
          Esplora lo shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
      <Link href="/carrello" className="inline-flex items-center gap-2 text-sm text-warm-600 hover:text-warm-900 mb-4">
        <ArrowLeft size={14} /> Torna al carrello
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {phase === "address" && (
            <form onSubmit={submitAddress} className="space-y-5">
              <div className="text-xs uppercase tracking-[0.2em] text-warm-500">Contatto</div>
              <Field label="Email *" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome *" value={form.firstName} onChange={(v) => updateField("firstName", v)} />
                <Field label="Cognome *" value={form.lastName} onChange={(v) => updateField("lastName", v)} />
              </div>
              <Field label="Telefono" type="tel" value={form.phone} onChange={(v) => updateField("phone", v)} />

              <div className="text-xs uppercase tracking-[0.2em] text-warm-500 pt-4 border-t border-warm-200">Indirizzo di spedizione</div>
              <Field label="Via e numero civico *" value={form.street} onChange={(v) => updateField("street", v)} />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><Field label="Città *" value={form.city} onChange={(v) => updateField("city", v)} /></div>
                <Field label="Provincia" value={form.province} onChange={(v) => updateField("province", v.toUpperCase())} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="CAP *" value={form.postalCode} onChange={(v) => updateField("postalCode", v)} />
                <div className="col-span-2">
                  <label className="block text-[13px] text-warm-700 mb-1.5">Paese *</label>
                  <select value={form.country} onChange={(e) => updateField("country", e.target.value)} className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none">
                    <option value="IT">Italia</option>
                    <option value="FR">Francia</option>
                    <option value="DE">Germania</option>
                    <option value="AT">Austria</option>
                    <option value="CH">Svizzera</option>
                    <option value="ES">Spagna</option>
                    <option value="NL">Paesi Bassi</option>
                    <option value="BE">Belgio</option>
                    <option value="PT">Portogallo</option>
                    <option value="GB">Regno Unito</option>
                    <option value="US">Stati Uniti</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-warm-200">
                <label className="block text-[13px] text-warm-700 mb-1.5">Note (opzionale)</label>
                <textarea value={form.customerNotes} onChange={(e) => updateField("customerNotes", e.target.value)} rows={2} className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none" />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 disabled:bg-warm-400"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={14} />}
                {submitting ? "Calcolo totale..." : "Continua al pagamento"}
              </button>
            </form>
          )}

          {phase === "payment" && intent && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret, appearance: { theme: "stripe" } }}>
              <PaymentForm orderNumber={intent.orderNumber} orderId={intent.orderId} onError={setError} router={router} />
            </Elements>
          )}
        </div>

        {/* Riepilogo */}
        <aside className="lg:sticky lg:top-28 self-start space-y-4 p-6 border border-warm-200 rounded bg-warm-50/40">
          <h2 className="text-sm uppercase tracking-[0.2em] text-warm-500">Riepilogo ordine</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto text-sm pr-2">
            {items.map((it) => (
              <div key={it.variantId} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-warm-900 truncate">{it.productName}</div>
                  <div className="text-warm-500 text-xs">x{it.quantity}{it.variantAttributes && ` · ${it.variantAttributes}`}</div>
                </div>
                <div className="text-warm-900 shrink-0">{eur(it.priceCents * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-warm-200 pt-3 space-y-1.5 text-sm">
            <Row label="Subtotale" value={eur(intent?.subtotalCents ?? subtotalCents)} />
            <Row label="Spedizione" value={intent ? eur(intent.shippingCents) : "—"} subtle={!intent} />
            {intent && <Row label="(IVA inclusa)" value={eur(intent.taxCents)} subtle />}
          </div>
          <div className="border-t border-warm-200 pt-3 flex justify-between items-baseline">
            <span className="text-warm-900 font-medium">Totale</span>
            <span className="text-2xl font-light text-warm-900">{eur(intent?.amountCents ?? subtotalCents)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[13px] text-warm-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none"
      />
    </div>
  );
}

function Row({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className={`flex justify-between ${subtle ? "text-warm-500 text-xs" : "text-warm-700"}`}>
      <span>{label}</span>
      <span className={subtle ? "text-warm-500" : "text-warm-900"}>{value}</span>
    </div>
  );
}

function PaymentForm({ orderNumber, orderId, onError, router }: { orderNumber: string; orderId: string; onError: (e: string | null) => void; router: ReturnType<typeof useRouter> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order=${orderId}`,
      },
      redirect: "if_required",
    });
    if (error) {
      onError(error.message || "Errore pagamento.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      // Cart sarà svuotato in success page
      router.push(`/checkout/success?order=${orderId}`);
      return;
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-xs uppercase tracking-[0.2em] text-warm-500">Pagamento — Ordine {orderNumber}</div>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 disabled:bg-warm-400"
      >
        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={14} />}
        {submitting ? "Elaborazione..." : "Paga ora"}
      </button>
      <p className="text-[11px] text-warm-500 text-center">
        Pagamento sicuro tramite Stripe. I tuoi dati sono crittografati.
      </p>
    </form>
  );
}
