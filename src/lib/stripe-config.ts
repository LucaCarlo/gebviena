import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

let _stripeInstance: Stripe | null = null;
let _cachedSecretKey: string | null = null;

export interface StoreStripeConfig {
  mode: "test" | "live";
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

async function loadSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getStripeConfig(): Promise<StoreStripeConfig> {
  const map = await loadSettings([
    "store.stripe.mode",
    "store.stripe.publishable_key",
    "store.stripe.secret_key",
    "store.stripe.webhook_secret",
  ]);
  return {
    mode: (map["store.stripe.mode"] === "live" ? "live" : "test"),
    publishableKey: map["store.stripe.publishable_key"] || "",
    secretKey: map["store.stripe.secret_key"] || "",
    webhookSecret: map["store.stripe.webhook_secret"] || "",
  };
}

export async function getStripe(): Promise<Stripe> {
  const cfg = await getStripeConfig();
  if (!cfg.secretKey) {
    throw new Error("Stripe secret key non configurata. Vai su /admin/store/settings.");
  }
  if (_stripeInstance && _cachedSecretKey === cfg.secretKey) return _stripeInstance;
  _stripeInstance = new Stripe(cfg.secretKey, { apiVersion: "2025-02-24.acacia" });
  _cachedSecretKey = cfg.secretKey;
  return _stripeInstance;
}

export interface StoreGeneralConfig {
  currency: string;
  /** IVA in basis points per paese (es. {IT: 2200, FR: 2000, ROW: 0}).
   *  La key 'ROW' è il fallback per paesi senza un override esplicito. */
  taxRateBpByCountry: Record<string, number>;
  /** Helper retro-compat: alias di taxRateBpByCountry.IT. */
  taxRateBpIt: number;
  /** Helper retro-compat: alias di taxRateBpByCountry.FR. */
  taxRateBpFr: number;
  /** @deprecated alias di taxRateBpIt. */
  taxRateBp: number;
  defaultCountry: string;
  /** @deprecated leggere shipping.lead_time_it/fr direttamente. Backward-compat. */
  deliveryLeadTime: string;
  deliveryLeadTimeFr: string;
}

// Helper: ritorna l'aliquota IVA in basis points per il paese richiesto.
// Cerca prima il setting specifico, poi cade su ROW, poi 0.
export function getTaxRateBp(cfg: StoreGeneralConfig, countryCode: string): number {
  const cc = (countryCode || "").toUpperCase();
  return cfg.taxRateBpByCountry[cc] ?? cfg.taxRateBpByCountry.ROW ?? 0;
}

export async function getStoreGeneralConfig(): Promise<StoreGeneralConfig> {
  // Carica TUTTI i setting in un colpo: i singoli noti + tutti i tax_rate_pct_*.
  const knownKeys = [
    "store.currency",
    "store.default_country",
    "shipping.lead_time_it",
    "shipping.lead_time_fr",
    // legacy fallback (se la migrazione non avesse rinominato)
    "store.delivery_lead_time",
    "store.delivery_lead_time_fr",
  ];
  const [knownRows, pctRows] = await Promise.all([
    prisma.setting.findMany({ where: { key: { in: knownKeys } } }),
    prisma.setting.findMany({ where: { key: { startsWith: "store.tax_rate_pct_" } } }),
  ]);
  const map: Record<string, string> = {};
  for (const r of knownRows) map[r.key] = r.value;

  // Costruisce taxRateBpByCountry dai setting store.tax_rate_pct_{cc}
  const taxRateBpByCountry: Record<string, number> = {};
  for (const r of pctRows) {
    const m = r.key.match(/^store\.tax_rate_pct_([a-z]+)$/);
    if (!m) continue;
    const cc = m[1].toUpperCase();
    const pct = parseFloat((r.value || "0").replace(",", "."));
    if (Number.isFinite(pct) && pct >= 0) {
      taxRateBpByCountry[cc] = Math.round(pct * 100); // % → basis points
    }
  }
  // Default safety: se mancano IT/FR/ROW, fissa quelli legacy.
  if (taxRateBpByCountry.IT == null) taxRateBpByCountry.IT = 2200;
  if (taxRateBpByCountry.FR == null) taxRateBpByCountry.FR = 2000;
  if (taxRateBpByCountry.ROW == null) taxRateBpByCountry.ROW = 0;

  const itLead = (map["shipping.lead_time_it"] || map["store.delivery_lead_time"] || "6 settimane").trim() || "6 settimane";
  const frLead = (map["shipping.lead_time_fr"] || map["store.delivery_lead_time_fr"] || "6 semaines").trim() || "6 semaines";

  return {
    currency: (map["store.currency"] || "EUR").toUpperCase(),
    taxRateBpByCountry,
    taxRateBpIt: taxRateBpByCountry.IT,
    taxRateBpFr: taxRateBpByCountry.FR,
    taxRateBp: taxRateBpByCountry.IT,
    defaultCountry: (map["store.default_country"] || "IT").toUpperCase(),
    deliveryLeadTime: itLead,
    deliveryLeadTimeFr: frLead,
  };
}
