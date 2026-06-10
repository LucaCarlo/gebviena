"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, CircleAlert } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useStoreT } from "@/lib/use-store-t";
import AuthForms from "./AuthForms";

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
  return new Intl.NumberFormat("it-IT", { useGrouping: "always", style: "currency", currency: "EUR" }).format(cents / 100);
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

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-warm-500 mb-1">{t("Ordine", "Commande")}</div>
          <h1 className="text-3xl font-light text-warm-900 font-mono">#{order.orderNumber}</h1>
          <div className="text-sm text-warm-500 mt-1">{fmtDate(order.createdAt)}</div>
        </div>
      </div>

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
