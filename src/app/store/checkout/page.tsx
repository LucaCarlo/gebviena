"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLang } from "@/contexts/I18nContext";
import { useStoreT } from "@/lib/use-store-t";
import { fbTrack } from "@/lib/fbpixel";

const eur = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

interface IntentResponse {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  amountCents: number;
  subtotalCents: number;
  shippingCents: number;
  standardShippingCents?: number;
  floorDeliveryCents?: number;
  freeStandardShippingApplied?: boolean;
  resolvedRegion?: string | null;
  unboxingFeeCents: number;
  taxCents: number;
  currency: string;
}

interface LiveQuote {
  ready: boolean;
  subtotalCents: number;
  standardShippingCents: number;
  floorDeliveryCents: number;
  unboxingFeeCents: number;
  totalShippingCents: number;
  totalCents: number;
  freeShippingApplied: boolean;
  resolvedRegion: string | null;
  storePickup?: boolean;
  billableVolumeM3?: number;
  totalVolumeM3?: number;
  missing?: string;
  market?: "IT" | "FR";
  lines?: Array<{ variantId: string; unitPriceCents: number; quantity: number; lineCents: number }>;
}

const FREE_SHIPPING_THRESHOLD_CENTS = 95000; // 950 EUR
const SHIPPING_REMINDER_RANGE_CENTS = 20000; // mostra reminder se manca <= 200 EUR

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, count } = useCart();
  const lang = useLang();
  const t = useStoreT();

  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [phase, setPhase] = useState<"address" | "payment">("address");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [bonificoEnabled, setBonificoEnabled] = useState(false);

  // Carica eventuale prefill da "Riprova al checkout" (area riservata cliente).
  // L'oggetto è scritto in localStorage da retryOrderCheckout() e contiene
  // tutti i campi del form precompilati.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("gtv_checkout_prefill");
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && typeof p === "object") {
        setForm((s) => ({
          ...s,
          email: p.email || s.email,
          firstName: p.firstName || s.firstName,
          lastName: p.lastName || s.lastName,
          phone: p.phone || s.phone,
          taxId: p.taxId || s.taxId,
          street: p.street || s.street,
          city: p.city || s.city,
          province: p.province || s.province,
          postalCode: p.postalCode || s.postalCode,
          country: p.country || s.country,
          storePickup: !!p.storePickup,
          shippingFloor: p.shippingFloor || s.shippingFloor,
          withUnboxingService: !!p.withUnboxingService,
          customerNotes: p.customerNotes || s.customerNotes,
        }));
      }
      // Consumalo (no replay accidentale al prossimo checkout)
      localStorage.removeItem("gtv_checkout_prefill");
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Meta Pixel: InitiateCheckout una sola volta al mount se ci sono items.
  useEffect(() => {
    if (count > 0) {
      fbTrack("InitiateCheckout", {
        content_ids: items.map((i) => i.variantId),
        num_items: count,
        value: subtotalCents / 100,
        currency: "EUR",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bonifico">("stripe");

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    taxId: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "IT",
    shippingFloor: "0",
    withUnboxingService: false,
    storePickup: false,
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
          setError(t("Stripe non configurato. Configura le chiavi su /admin/store/settings.", "Stripe non configuré. Configurez les clés sur /admin/store/settings."));
        }
        if (d.success && d.data?.bonificoEnabled === true) {
          setBonificoEnabled(true);
        }
      })
      .catch(() => setError(t("Errore caricamento configurazione Stripe.", "Erreur de chargement de la configuration Stripe.")));
  }, []);

  const updateField = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v as never }));

  // Fingerprint del carrello (variantId × quantity) per evitare loop di refetch
  // dovuti al fatto che `items` è una nuova reference ad ogni render.
  const itemsFingerprint = items.map((i) => `${i.variantId}:${i.quantity}`).join("|");

  // Quote spedizione live: ricalcola appena cambiano country/CAP/provincia/
  // piano/disimballo o il contenuto del carrello. Debounced 350ms per non
  // martellare l'endpoint mentre l'utente digita. Niente bottone richiesto.
  useEffect(() => {
    if (phase !== "address") return;
    if (items.length === 0) { setQuote(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setQuoting(true);
      fetch("/api/store/public/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          country: form.country,
          postalCode: form.postalCode,
          province: form.province,
          shippingFloor: Number(form.shippingFloor) || 0,
          withUnboxingService: form.withUnboxingService === true,
          storePickup: form.storePickup === true,
        }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((d) => { if (d.success) setQuote(d.data); })
        .catch(() => { /* abort/network — ignora silenziosamente */ })
        .finally(() => setQuoting(false));
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, itemsFingerprint, form.country, form.postalCode, form.province, form.shippingFloor, form.withUnboxingService, form.storePickup]);

  const submitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazione minima. Con ritiro in negozio non serve l'indirizzo di spedizione.
    const required = form.storePickup
      ? ["email", "firstName", "lastName", "phone", "taxId"]
      : ["email", "firstName", "lastName", "phone", "taxId", "street", "city", "postalCode", "country"];
    for (const k of required) {
      if (!form[k as keyof typeof form]?.toString().trim()) {
        setError(t("Compila tutti i campi obbligatori.", "Veuillez remplir tous les champs obligatoires."));
        return;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t("Email non valida.", "E-mail invalide."));
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = paymentMethod === "bonifico"
        ? "/api/store/public/checkout/create-bonifico-order"
        : "/api/store/public/checkout/create-payment-intent";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          customer: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            taxId: form.taxId,
          },
          shippingAddress: form.storePickup
            ? { street: "Via Foggia 23H", city: "Torino", province: "TO", postalCode: "10125", country: "IT" }
            : {
                street: form.street,
                city: form.city,
                province: form.province,
                postalCode: form.postalCode,
                country: form.country,
              },
          shippingFloor: Number(form.shippingFloor) || 0,
          withUnboxingService: form.withUnboxingService === true,
          storePickup: form.storePickup === true,
          customerNotes: form.customerNotes,
          lang,
          cartSessionId: typeof window !== "undefined" ? (localStorage.getItem("gtv_cart_session_v1") || "") : "",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || t("Errore creazione ordine.", "Erreur lors de la création de la commande."));
        setSubmitting(false);
        return;
      }
      if (paymentMethod === "bonifico") {
        // Bonifico: ordine creato senza Stripe, email già inviata. Vai diretto alla success page.
        window.location.href = `/store/checkout/success?order=${encodeURIComponent(data.data.orderId)}`;
        return;
      }
      setIntent(data.data);
      setPhase("payment");
    } catch {
      setError(t("Errore di connessione. Riprova.", "Erreur de connexion. Réessayez."));
    } finally {
      setSubmitting(false);
    }
  };

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-light text-warm-900 mb-3">{t("Il carrello è vuoto", "Votre panier est vide")}</h1>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800">
          {t("Esplora lo shop", "Explorer la boutique")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <Link href="/carrello" className="inline-flex items-center gap-2 text-sm text-warm-600 hover:text-warm-900 mb-4">
        <ArrowLeft size={14} /> {t("Torna al carrello", "Retour au panier")}
      </Link>
      <h1 className="text-3xl font-light text-warm-900 mb-8">{t("Checkout", "Paiement")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {phase === "address" && (
            <form onSubmit={submitAddress} className="space-y-5">
              <div className="text-xs uppercase tracking-[0.2em] text-warm-500">{t("Contatto", "Contact")}</div>
              <Field label={t("E-mail *", "E-mail *")} type="email" value={form.email} onChange={(v) => updateField("email", v)} />
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("Nome *", "Prénom *")} value={form.firstName} onChange={(v) => updateField("firstName", v)} />
                <Field label={t("Cognome *", "Nom *")} value={form.lastName} onChange={(v) => updateField("lastName", v)} />
              </div>
              <div>
                <Field label={t("Telefono *", "Téléphone *")} type="tel" value={form.phone} onChange={(v) => updateField("phone", v)} />
                <p className="text-[11px] text-warm-500 mt-1">
                  {t("Necessario al corriere per la consegna dell'ordine.", "Nécessaire au transporteur pour la livraison de la commande.")}
                </p>
              </div>
              <Field
                label={t("P.IVA o Codice Fiscale *", "N° TVA ou Code fiscal *")}
                value={form.taxId}
                onChange={(v) => updateField("taxId", v.toUpperCase())}
              />

              <div className="text-xs uppercase tracking-[0.2em] text-warm-500 pt-4 border-t border-warm-200">{t("Indirizzo di spedizione", "Adresse de livraison")}</div>
              <Field label={t("Via e numero civico *", "Rue et numéro *")} value={form.street} onChange={(v) => updateField("street", v)} />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><Field label={t("Città *", "Ville *")} value={form.city} onChange={(v) => updateField("city", v)} /></div>
                <Field label={t("Provincia", "Province")} value={form.province} onChange={(v) => updateField("province", v.toUpperCase())} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label={t("CAP *", "Code postal *")} value={form.postalCode} onChange={(v) => updateField("postalCode", v)} />
                <div className="col-span-2">
                  <label className="block text-[13px] text-warm-700 mb-1.5">{t("Paese *", "Pays *")}</label>
                  <select value={form.country} onChange={(e) => updateField("country", e.target.value)} className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none">
                    <option value="IT">{t("Italia", "Italie")}</option>
                    <option value="FR">{t("Francia", "France")}</option>
                  </select>
                </div>
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-warm-500 pt-4 border-t border-warm-200">{t("Consegna", "Livraison")}</div>

              <label className={`flex items-start gap-3 cursor-pointer rounded-lg border-2 p-4 transition-colors ${form.storePickup ? "border-warm-800 bg-warm-50" : "border-warm-300 bg-white hover:border-warm-400"}`}>
                <input
                  type="checkbox"
                  checked={form.storePickup}
                  onChange={(e) => updateField("storePickup", e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-warm-800"
                />
                <span className="text-[13px] text-warm-800">
                  <strong className="block text-sm mb-0.5">{t("Ritiro al punto di vendita — spedizione gratuita", "Retrait en magasin — livraison offerte")}</strong>
                  {t("Ritiri il tuo ordine direttamente nello showroom: Via Foggia 23H – 10125 Torino. Nessun costo di spedizione.", "Retirez votre commande directement au showroom : Via Foggia 23H – 10125 Turin. Aucun frais de livraison.")}
                </span>
              </label>

              {form.storePickup ? (
                <div className="text-[12px] text-warm-700 bg-warm-50 border border-warm-200 rounded p-3 leading-[1.6]">
                  {t(
                    "Hai scelto il ritiro al punto di vendita: nessun costo di spedizione né consegna al piano. Ti contatteremo per concordare il giorno del ritiro presso lo showroom di Via Foggia 23H – 10125 Torino.",
                    "Vous avez choisi le retrait en magasin : aucun frais de livraison ni de livraison à l'étage. Nous vous contacterons pour convenir du jour de retrait au showroom Via Foggia 23H – 10125 Turin.",
                  )}
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-warm-700 mb-1.5">{t("Piano dove scaricare il pacco", "Étage de livraison")}</label>
                  <select
                    value={form.shippingFloor}
                    onChange={(e) => updateField("shippingFloor", e.target.value)}
                    className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm bg-white focus:border-warm-700 outline-none"
                  >
                    <option value="0">{t("Piano terra", "Rez-de-chaussée")}</option>
                    <option value="1">{t("1° piano", "1er étage")}</option>
                    <option value="2">{t("2° piano", "2e étage")}</option>
                    <option value="3">{t("3° piano", "3e étage")}</option>
                    <option value="4">{t("4° piano", "4e étage")}</option>
                    <option value="5">{t("5° piano o oltre", "5e étage ou plus")}</option>
                  </select>
                </div>
                <label className="flex items-start gap-2 pt-7 cursor-pointer text-[13px] text-warm-800">
                  <input
                    type="checkbox"
                    checked={form.withUnboxingService}
                    onChange={(e) => updateField("withUnboxingService", e.target.checked)}
                    className="mt-1"
                  />
                  <span>{t("Servizio disimballo e smaltimento imballi", "Service de déballage et reprise des emballages")} <span className="text-warm-500">(+20€/m³)</span></span>
                </label>
              </div>
              <p className="text-[11px] text-warm-500 leading-[1.55]">
                {t("Consegna al piano (oltre piano terra):", "Livraison à l'étage (au-delà du rez-de-chaussée) :")} <strong>{form.country === "FR" ? "140€/m³" : "120€/m³"}</strong> {t("aggiuntivo. Servizi addizionali si applicano anche con spedizione gratuita.", "en supplément. Les services additionnels s'appliquent aussi avec la livraison gratuite.")}
              </p>

              {/* Note sempre visibili al checkout */}
              <div className="space-y-2 text-[11px] text-warm-600 leading-[1.6] bg-warm-50 border border-warm-200 rounded p-3">
                <p>
                  <strong>{t("Nota — consegna al piano:", "Note — livraison à l'étage :")}</strong>{" "}
                  {t(
                    "Il costo indicato si riferisce a un servizio di consegna che non prevede particolari difficoltà di accesso ai locali e/o specifiche esigenze di movimentazione dei prodotti ordinati, come per esempio prodotti particolarmente pesanti o voluminosi, necessità di utilizzare una piattaforma esterna, obbligo di richiedere particolari permessi, necessità di personale extra per la movimentazione. Nel caso in cui si verificasse una di queste condizioni, è necessario informare il servizio clienti che si occuperà di rivedere la quotazione e di ricalcolare gli eventuali costi del servizio in accordo con le condizioni sopra descritte.",
                    "Le coût indiqué se réfère à un service de livraison ne présentant pas de difficultés particulières d'accès aux locaux et/ou d'exigences spécifiques de manutention des produits commandés, par exemple produits particulièrement lourds ou volumineux, nécessité d'utiliser une plateforme externe, obligation de demander des autorisations particulières, besoin de personnel supplémentaire pour la manutention. Si l'une de ces conditions se présentait, il est nécessaire d'informer le service client qui se chargera de revoir le devis et de recalculer les éventuels coûts du service selon les conditions décrites ci-dessus.",
                  )}
                </p>
                <p>
                  {t(
                    "La spedizione standard in Italia è gratuita per ordini superiori a 950€, salvo alcune eccezioni legate a prodotti particolarmente voluminosi o a consegne in aree remote.",
                    "La livraison standard en Italie est gratuite pour les commandes supérieures à 950€, sauf exceptions liées à des produits particulièrement volumineux ou à des livraisons en zones reculées.",
                  )}
                </p>
              </div>
              </>
              )}

              {/* Reminder spedizione gratuita (solo se mancano <= 200€ alla soglia) */}
              {(() => {
                const sub = subtotalCents;
                const missing = FREE_SHIPPING_THRESHOLD_CENTS - sub;
                if (sub >= FREE_SHIPPING_THRESHOLD_CENTS) {
                  return (
                    <div className="text-[13px] bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-800">
                      🎉 {t("Hai diritto alla", "Vous bénéficiez de la")} <strong>{t("spedizione gratuita", "livraison gratuite")}</strong> !
                    </div>
                  );
                }
                if (missing > 0 && missing <= SHIPPING_REMINDER_RANGE_CENTS) {
                  return (
                    <div className="text-[13px] bg-amber-50 border border-amber-200 rounded p-3 text-amber-800">
                      {t("Aggiungi ancora", "Ajoutez encore")} <strong>{eur(missing)}</strong> {t(`per la spedizione gratuita (soglia ${eur(FREE_SHIPPING_THRESHOLD_CENTS)}).`, `pour bénéficier de la livraison gratuite (seuil ${eur(FREE_SHIPPING_THRESHOLD_CENTS)}).`)}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="pt-4 border-t border-warm-200">
                <label className="block text-[13px] text-warm-700 mb-1.5">{t("Note (opzionale)", "Remarques (facultatif)")}</label>
                <textarea value={form.customerNotes} onChange={(e) => updateField("customerNotes", e.target.value)} rows={2} className="w-full border border-warm-300 rounded px-3 py-2.5 text-sm focus:border-warm-700 outline-none" />
              </div>

              {bonificoEnabled && (
                <div className="pt-4 border-t border-warm-200 space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-warm-500">{t("Modalità di pagamento", "Mode de paiement")}</div>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-lg border-2 p-3 transition-colors ${paymentMethod === "stripe" ? "border-warm-800 bg-warm-50" : "border-warm-300 bg-white hover:border-warm-400"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={paymentMethod === "stripe"}
                      onChange={() => setPaymentMethod("stripe")}
                      className="mt-1 w-4 h-4 accent-warm-800"
                    />
                    <span className="text-[13px] text-warm-800">
                      <strong className="block text-sm">{t("Carta di credito / Klarna", "Carte bancaire / Klarna")}</strong>
                      {t("Pagamento sicuro tramite Stripe. Conferma istantanea dell'ordine.", "Paiement sécurisé via Stripe. Confirmation instantanée de la commande.")}
                    </span>
                  </label>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-lg border-2 p-3 transition-colors ${paymentMethod === "bonifico" ? "border-warm-800 bg-warm-50" : "border-warm-300 bg-white hover:border-warm-400"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bonifico"
                      checked={paymentMethod === "bonifico"}
                      onChange={() => setPaymentMethod("bonifico")}
                      className="mt-1 w-4 h-4 accent-warm-800"
                    />
                    <span className="text-[13px] text-warm-800">
                      <strong className="block text-sm">{t("Bonifico bancario", "Virement bancaire")}</strong>
                      {t("Riceverai le coordinate bancarie via email. L'ordine sarà elaborato dopo conferma dell'avvenuto accredito.", "Vous recevrez les coordonnées bancaires par e-mail. La commande sera traitée après confirmation de la réception des fonds.")}
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 disabled:bg-warm-400"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={14} />}
                {submitting
                  ? t("Calcolo totale...", "Calcul du total…")
                  : paymentMethod === "bonifico"
                    ? t("Conferma ordine (bonifico)", "Confirmer la commande (virement)")
                    : t("Continua al pagamento", "Continuer vers le paiement")}
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
          <h2 className="text-sm uppercase tracking-[0.2em] text-warm-500">{t("Riepilogo ordine", "Récapitulatif de commande")}</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto text-sm pr-2">
            {items.map((it) => {
              // Prezzo per riga: se il quote (basato sul PAESE di spedizione)
              // ha risolto i prezzi di mercato, usa quelli — così in Francia
              // si vede il prezzo FR anche navigando in italiano.
              const ql = quote?.lines?.find((l) => l.variantId === it.variantId);
              const lineCents = ql ? ql.lineCents : it.priceCents * it.quantity;
              return (
                <div key={it.variantId} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-warm-900 truncate">{it.productName}</div>
                    <div className="text-warm-500 text-xs">x{it.quantity}{it.variantAttributes && ` · ${it.variantAttributes}`}</div>
                  </div>
                  <div className="text-warm-900 shrink-0">{eur(lineCents)}</div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-warm-200 pt-3 space-y-1.5 text-sm">
            <Row label={t("Subtotale", "Sous-total")} value={eur(intent?.subtotalCents ?? quote?.subtotalCents ?? subtotalCents)} />
            {form.storePickup ? (
              <>
                <Row
                  label={t("Spedizione", "Livraison")}
                  value={t("Ritiro al punto di vendita — gratuito", "Retrait en magasin — offert")}
                />
                {intent && <Row label={t("(IVA inclusa)", "(TVA incluse)")} value={eur(intent.taxCents)} subtle />}
              </>
            ) : intent ? (
              <>
                <Row
                  label={`${t("Spedizione standard", "Livraison standard")}${intent.resolvedRegion ? ` · ${intent.resolvedRegion}` : ""}`}
                  value={intent.freeStandardShippingApplied
                    ? t("Gratuita", "Offerte")
                    : eur(intent.standardShippingCents ?? intent.shippingCents)}
                />
                {(intent.floorDeliveryCents ?? 0) > 0 && (
                  <Row label={t("Consegna al piano", "Livraison à l'étage")} value={eur(intent.floorDeliveryCents!)} />
                )}
                {intent.unboxingFeeCents > 0 && (
                  <Row label={t("Disimballo e smaltimento", "Déballage et reprise emballages")} value={eur(intent.unboxingFeeCents)} />
                )}
                <Row label={t("(IVA inclusa)", "(TVA incluse)")} value={eur(intent.taxCents)} subtle />
              </>
            ) : quote && quote.ready ? (
              <>
                <Row
                  label={`${t("Spedizione standard", "Livraison standard")}${quote.resolvedRegion ? ` · ${quote.resolvedRegion}` : ""}`}
                  value={quote.freeShippingApplied ? t("Gratuita", "Offerte") : eur(quote.standardShippingCents)}
                />
                {quote.floorDeliveryCents > 0 && (
                  <Row label={t("Consegna al piano", "Livraison à l'étage")} value={eur(quote.floorDeliveryCents)} />
                )}
                {quote.unboxingFeeCents > 0 && (
                  <Row label={t("Disimballo e smaltimento", "Déballage et reprise emballages")} value={eur(quote.unboxingFeeCents)} />
                )}
                {(quote.billableVolumeM3 ?? 0) > 0 && (quote.totalVolumeM3 ?? 0) > 0 && (
                  <Row
                    label={t("Volume fatturato", "Volume facturé")}
                    value={`${quote.billableVolumeM3} m³ ${t(`(reali ${(quote.totalVolumeM3 ?? 0).toFixed(2)} m³)`, `(réel ${(quote.totalVolumeM3 ?? 0).toFixed(2)} m³)`)}`}
                    subtle
                  />
                )}
              </>
            ) : (
              <Row
                label={t("Spedizione", "Livraison")}
                value={quote && !quote.ready && quote.missing
                  ? t(`inserisci ${quote.missing}`, `saisissez ${quote.missing}`)
                  : (quoting ? t("calcolo…", "calcul…") : t("inserisci indirizzo", "saisissez l'adresse"))}
                subtle
              />
            )}
          </div>
          <div className="border-t border-warm-200 pt-3 flex justify-between items-baseline">
            <span className="text-warm-900 font-medium">{t("Totale", "Total")}</span>
            <span className="text-2xl font-light text-warm-900 inline-flex items-center gap-2">
              {quoting && !intent && <Loader2 size={14} className="animate-spin text-warm-400" />}
              {eur(intent?.amountCents ?? quote?.totalCents ?? subtotalCents)}
            </span>
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
  const t = useStoreT();
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
      onError(error.message || t("Errore pagamento.", "Erreur de paiement."));
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
      <div className="text-xs uppercase tracking-[0.2em] text-warm-500">{t("Pagamento — Ordine", "Paiement — Commande")} {orderNumber}</div>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center gap-2 py-4 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800 disabled:bg-warm-400"
      >
        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={14} />}
        {submitting ? t("Elaborazione...", "Traitement…") : t("Paga ora", "Payer maintenant")}
      </button>
      <p className="text-[11px] text-warm-500 text-center">
        {t("Pagamento sicuro tramite Stripe. I tuoi dati sono crittografati.", "Paiement sécurisé via Stripe. Vos données sont chiffrées.")}
      </p>
    </form>
  );
}
