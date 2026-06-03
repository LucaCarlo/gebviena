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
  /** Aliquota IVA Italia in basis points (es. 2200 = 22%). */
  taxRateBpIt: number;
  /** Aliquota IVA Francia in basis points (es. 2000 = 20%). */
  taxRateBpFr: number;
  /** @deprecated retro-compat: alias di taxRateBpIt. */
  taxRateBp: number;
  defaultCountry: string;
  deliveryLeadTime: string;
  deliveryLeadTimeFr: string;
}

export async function getStoreGeneralConfig(): Promise<StoreGeneralConfig> {
  const map = await loadSettings([
    "store.currency",
    "store.tax_rate_bp",
    "store.tax_rate_bp_it",
    "store.tax_rate_bp_fr",
    "store.default_country",
    "store.delivery_lead_time",
    "store.delivery_lead_time_fr",
  ]);
  // IT: priorità a `tax_rate_bp_it`, fallback al vecchio `tax_rate_bp`, poi 2200.
  const taxIt = parseInt(map["store.tax_rate_bp_it"] || map["store.tax_rate_bp"] || "2200", 10) || 2200;
  const taxFr = parseInt(map["store.tax_rate_bp_fr"] || "2000", 10) || 2000;
  const itLead = (map["store.delivery_lead_time"] || "6 settimane").trim() || "6 settimane";
  return {
    currency: (map["store.currency"] || "EUR").toUpperCase(),
    taxRateBpIt: taxIt,
    taxRateBpFr: taxFr,
    taxRateBp: taxIt,
    defaultCountry: (map["store.default_country"] || "IT").toUpperCase(),
    deliveryLeadTime: itLead,
    deliveryLeadTimeFr: (map["store.delivery_lead_time_fr"] || "6 semaines").trim() || "6 semaines",
  };
}
