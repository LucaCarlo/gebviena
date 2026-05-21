"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, CircleAlert, Loader2 } from "lucide-react";
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
  const t = useStoreT();
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

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">{t("Caricamento…", "Chargement…")}</div>;
  if (!customer) return <AuthForms />;
  if (notFound) return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <div className="border border-warm-200 p-12 text-center">
        <CircleAlert size={28} className="mx-auto text-warm-400 mb-3" />
        <div className="text-warm-600 mb-4">{t("Ordine non trovato.", "Commande introuvable.")}</div>
        <Link href="/account/orders" className="text-xs uppercase tracking-[0.2em] text-warm-900 border-b border-warm-900 pb-0.5">
          {t("Torna agli ordini", "Retour aux commandes")}
        </Link>
      </div>
    </div>
  );
  if (!order) return <div className="max-w-4xl mx-auto p-12 text-center text-warm-500 text-sm">{t("Caricamento ordine…", "Chargement de la commande…")}</div>;

  const shipping = safeParseAddress(order.shippingAddress);
  const billing = safeParseAddress(order.billingAddress);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-warm-500 hover:text-warm-900 mb-6">
        <ChevronLeft size={14} /> {t("I miei ordini", "Mes commandes")}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-warm-500 mb-1">{t("Ordine", "Commande")}</div>
          <h1 className="text-3xl font-light text-warm-900 font-mono">#{order.orderNumber}</h1>
          <div className="text-sm text-warm-500 mt-1">{fmtDate(order.createdAt)}</div>
        </div>
      </div>

      {/* Banner stato dell'ordine — messaggio user-friendly + eventuale CTA */}
      <StatusBanner order={order} t={t} />

      {/* Nota contatti — il sito non gestisce le fasi di spedizione */}
      <div className="border border-warm-200 bg-warm-50/50 p-5 mb-8 text-sm text-warm-700 leading-relaxed">
        {t(
          "Per qualsiasi informazione sul tuo ordine, il nostro team è a disposizione all'indirizzo ",
          "Pour toute information sur votre commande, notre équipe est à votre disposition à l'adresse ",
        )}
        <a href="mailto:info@gebruederthonetvienna.com" className="text-warm-900 underline">info@gebruederthonetvienna.com</a>
        {t(" oppure al numero ", " ou au numéro ")}
        <a href="tel:+390110133330" className="text-warm-900 underline">+39 011 0133330</a>.
      </div>

      {/* Articoli */}
      <div className="border border-warm-200 mb-8">
        <div className="p-5 border-b border-warm-200 text-xs uppercase tracking-[0.2em] text-warm-500">{t("Articoli", "Articles")}</div>
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
          <Row label={t("Subtotale", "Sous-total")} value={eur(order.subtotalCents)} />
          <Row label={t("Spedizione", "Livraison")} value={eur(order.shippingCents)} />
          <Row label={t("IVA", "TVA")} value={eur(order.taxCents)} />
          <div className="pt-2 mt-2 border-t border-warm-200">
            <Row label={t("Totale", "Total")} value={eur(order.totalCents)} bold />
          </div>
        </div>
      </div>

      {/* Indirizzi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AddressCard
          title={t("Indirizzo di spedizione", "Adresse de livraison")}
          addr={shipping}
          recipient={`${order.firstName} ${order.lastName}`.trim()}
          phone={order.phone}
        />
        <AddressCard
          title={t("Indirizzo di fatturazione", "Adresse de facturation")}
          addr={billing}
          recipient={`${order.firstName} ${order.lastName}`.trim()}
          phone={order.phone}
        />
      </div>
    </div>
  );
}

function StatusBanner({ order, t }: { order: OrderFull; t: (it: string, fr: string) => string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  async function onRetry() {
    setRetrying(true);
    const ok = await retryOrderCheckout(order.id);
    if (ok) router.push("/checkout");
    else { alert(t("Errore nel recupero dei dati dell'ordine.", "Erreur de récupération des données.")); setRetrying(false); }
  }
  const isBonifico = order.paymentProvider === "bonifico";
  type Tone = "wait" | "warn" | "error" | "ok" | "neutral";
  let tone: Tone = "neutral";
  let label = order.status;
  let message = "";
  let cta: { label: string; href: string } | null = null;

  switch (order.status) {
    case "PENDING":
      if (isBonifico) {
        tone = "wait";
        label = t("In attesa di accredito bonifico", "En attente du virement");
        message = t(
          "Effettua il bonifico utilizzando le coordinate che ti abbiamo inviato per email. L'ordine verrà elaborato dopo la conferma di accredito.",
          "Effectuez le virement avec les coordonnées que nous vous avons envoyées par e-mail. La commande sera traitée après confirmation de la réception des fonds.",
        );
      } else {
        tone = "warn";
        label = t("Pagamento non effettuato", "Paiement non effectué");
        message = t(
          "Il pagamento non è stato completato. Clicca qui sotto per tornare alla pagina di pagamento con i tuoi dati già precompilati.",
          "Le paiement n'a pas été complété. Cliquez ci-dessous pour revenir à la page de paiement avec vos données pré-remplies.",
        );
        cta = { label: t("Effettua il pagamento", "Effectuer le paiement"), href: "/checkout" };
      }
      break;
    case "ABANDONED_CHECKOUT":
      tone = "warn";
      label = t("Pagamento non effettuato", "Paiement non effectué");
      message = t(
        "Il pagamento non è stato completato. Clicca qui sotto per tornare alla pagina di pagamento con i tuoi dati già precompilati.",
        "Le paiement n'a pas été complété. Cliquez ci-dessous pour revenir à la page de paiement avec vos données pré-remplies.",
      );
      cta = { label: t("Effettua il pagamento", "Effectuer le paiement"), href: "/checkout" };
      break;
    case "PAYMENT_FAILED":
      tone = "error";
      label = t("Pagamento non riuscito", "Paiement échoué");
      message = order.paymentErrorMessage
        ? t(`Il pagamento è stato rifiutato (${order.paymentErrorMessage}). Riprova ora o contattaci.`,
            `Le paiement a été refusé (${order.paymentErrorMessage}). Réessayez maintenant ou contactez-nous.`)
        : t("Il pagamento è stato rifiutato. Riprova ora o contattaci.",
            "Le paiement a été refusé. Réessayez maintenant ou contactez-nous.");
      cta = { label: t("Riprova il pagamento", "Réessayer le paiement"), href: "/checkout" };
      break;
    case "CANCELLED":
      tone = "neutral";
      label = t("Ordine annullato", "Commande annulée");
      message = t("Questo ordine è stato annullato e non sarà processato.",
        "Cette commande a été annulée et ne sera pas traitée.");
      break;
    case "PAID":
      tone = "ok";
      label = t("Pagamento confermato", "Paiement confirmé");
      message = t(
        "Abbiamo ricevuto il tuo pagamento. Il tuo ordine è in elaborazione: ti contatteremo prima della spedizione per concordare i dettagli.",
        "Nous avons reçu votre paiement. Votre commande est en traitement : nous vous contacterons avant l'expédition.",
      );
      break;
    case "PROCESSING":
      tone = "ok";
      label = t("In preparazione", "En préparation");
      message = t(
        "Stiamo preparando il tuo ordine. Ti contatteremo prima della spedizione per concordare i dettagli della consegna.",
        "Nous préparons votre commande. Nous vous contacterons avant l'expédition pour convenir des détails.",
      );
      break;
    case "SHIPPED":
      tone = "ok";
      label = t("Ordine spedito", "Commande expédiée");
      message = t(
        "Il tuo ordine è in viaggio. Il corriere ti contatterà al numero di telefono indicato per concordare la consegna.",
        "Votre commande est en route. Le transporteur vous contactera pour convenir de la livraison.",
      );
      break;
    case "DELIVERED":
      tone = "ok";
      label = t("Ordine consegnato", "Commande livrée");
      message = t("Il tuo ordine è stato consegnato. Grazie per averci scelto!",
        "Votre commande a été livrée. Merci de nous avoir choisis !");
      break;
    case "PICKED_UP":
      tone = "ok";
      label = t("Ordine ritirato in showroom", "Commande retirée au showroom");
      message = t("Hai ritirato il tuo ordine presso il nostro showroom. Grazie!",
        "Vous avez retiré votre commande dans notre showroom. Merci !");
      break;
    case "RETURNED":
      tone = "neutral";
      label = t("Reso", "Retourné");
      message = t("L'ordine è stato reso. Per dettagli sul rimborso contattaci.",
        "La commande a été retournée. Pour les détails du remboursement, contactez-nous.");
      break;
    case "REFUNDED":
      tone = "neutral";
      label = t("Rimborsato", "Remboursé");
      message = t("Hai ricevuto il rimborso totale per questo ordine.",
        "Vous avez reçu le remboursement total pour cette commande.");
      break;
    case "PARTIALLY_REFUNDED":
      tone = "neutral";
      label = t("Rimborso parziale", "Remboursement partiel");
      message = t("Hai ricevuto un rimborso parziale per questo ordine.",
        "Vous avez reçu un remboursement partiel pour cette commande.");
      break;
    default:
      message = "";
  }

  const toneCls: Record<Tone, { border: string; bg: string; chip: string; title: string }> = {
    wait:    { border: "border-amber-300",   bg: "bg-amber-50",   chip: "bg-amber-100 text-amber-800",       title: "text-amber-900" },
    warn:    { border: "border-orange-300",  bg: "bg-orange-50",  chip: "bg-orange-100 text-orange-800",     title: "text-orange-900" },
    error:   { border: "border-red-300",     bg: "bg-red-50",     chip: "bg-red-100 text-red-800",           title: "text-red-900" },
    ok:      { border: "border-emerald-300", bg: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-800",   title: "text-emerald-900" },
    neutral: { border: "border-warm-300",    bg: "bg-warm-50",    chip: "bg-warm-100 text-warm-700",         title: "text-warm-900" },
  };
  const c = toneCls[tone];

  return (
    <div className={`border ${c.border} ${c.bg} p-5 mb-6`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`text-[11px] uppercase tracking-[0.15em] px-2 py-0.5 rounded ${c.chip}`}>{label}</span>
        {order.trackingUrl && order.status === "SHIPPED" && (
          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.15em] text-warm-900 underline">
            {t("Traccia spedizione", "Suivre l'envoi")} →
          </a>
        )}
      </div>
      {message && <p className={`text-sm mt-3 leading-relaxed ${c.title}`}>{message}</p>}
      {cta && (
        <div className="mt-4">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] bg-warm-900 text-white px-4 py-2 hover:bg-black disabled:bg-warm-400"
          >
            {retrying && <Loader2 size={12} className="animate-spin" />}
            {cta.label} →
          </button>
        </div>
      )}
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

// Mappa il nome del paese da codice ISO (basata sulle opzioni del checkout)
const COUNTRY_NAMES: Record<string, [string, string]> = {
  IT: ["Italia", "Italie"], FR: ["Francia", "France"], DE: ["Germania", "Allemagne"], AT: ["Austria", "Autriche"], CH: ["Svizzera", "Suisse"],
  ES: ["Spagna", "Espagne"], NL: ["Paesi Bassi", "Pays-Bas"], BE: ["Belgio", "Belgique"], PT: ["Portogallo", "Portugal"], LU: ["Lussemburgo", "Luxembourg"],
  GB: ["Regno Unito", "Royaume-Uni"], US: ["Stati Uniti", "États-Unis"], IE: ["Irlanda", "Irlande"], SE: ["Svezia", "Suède"], DK: ["Danimarca", "Danemark"],
  FI: ["Finlandia", "Finlande"], PL: ["Polonia", "Pologne"], SI: ["Slovenia", "Slovénie"],
};

function countryLabel(code: string | undefined, t: (it: string, fr: string) => string): string {
  if (!code) return "";
  const c = COUNTRY_NAMES[code.toUpperCase()];
  return c ? t(c[0], c[1]) : code;
}

function AddressCard({
  title,
  addr,
  recipient,
  phone,
}: {
  title: string;
  addr: Record<string, string>;
  recipient?: string;
  phone?: string | null;
}) {
  const t = useStoreT();
  // L'address è salvato dal checkout come { street, city, province, postalCode, country }.
  // Manteniamo retrocompatibilità con un eventuale formato precedente { street1, zip, ... }.
  const street = addr.street || addr.street1 || "";
  const street2 = addr.street2 || "";
  const city = addr.city || "";
  const postalCode = addr.postalCode || addr.zip || "";
  const province = addr.province || addr.provinceCode || "";
  const country = addr.country || addr.countryCode || "";
  const has = !!(street || city || postalCode);

  return (
    <div className="border border-warm-200 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-3">{title}</div>
      {has ? (
        <div className="text-sm text-warm-800 leading-relaxed space-y-0.5">
          {recipient && <div className="font-medium text-warm-900">{recipient}</div>}
          {addr.company && <div>{addr.company}</div>}
          {street && <div>{street}</div>}
          {street2 && <div>{street2}</div>}
          <div>
            {[postalCode, city].filter(Boolean).join(" ")}
            {province ? ` (${province.toUpperCase()})` : ""}
          </div>
          {country && <div>{countryLabel(country, t)}</div>}
          {phone && <div className="text-warm-500 text-xs mt-2">{t("Tel.", "Tél.")} {phone}</div>}
        </div>
      ) : (
        <div className="text-sm text-warm-500 italic">{t("Non disponibile", "Non disponible")}</div>
      )}
    </div>
  );
}
